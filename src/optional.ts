/**
 * Import an optional dependency at runtime. The specifier is passed as a
 * variable (not a string literal) so TypeScript treats the result as `any` and
 * doesn't require the package to be installed at type-check time — these are
 * declared in `optionalDependencies` and only some are present per config.
 */
export function loadOptional(name: string): Promise<any> {
  return import(name);
}
