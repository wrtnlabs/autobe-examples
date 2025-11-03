import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingPasswordReset";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPasswordReset";

/**
 * Audit, search, and paginated listing of password reset requests by an admin.
 *
 * Steps:
 *
 * 1. Register (join) a new admin account (unique email and secure password,
 *    role=super).
 * 2. Use the returned token for admin authentication (SDK sets auth
 *    automatically).
 * 3. Construct a search/filter/pagination request for auditing password resets:
 *
 *    - Page, limit
 *    - Search (partial email fragment), actor_type, status, date range, etc.
 * 4. Call api.functional.shopping.admin.passwordResets.index with the constructed
 *    request.
 * 5. Assert response object structure:
 *
 *    - Pagination is correct
 *    - Data is array of IShoppingPasswordReset.ISummary (type, all fields)
 *    - Correct application of filters/pagination (expected results for given search)
 *    - Sensitive fields are present (admin view) or masked if applicable
 *    - All date/time fields are correctly formatted
 *    - Audit/info fields present for compliance
 */
export async function test_api_admin_password_reset_request_audit_and_search(
  connection: api.IConnection,
) {
  // 1. Register admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(12),
        name: RandomGenerator.name(),
        role: "super",
        status: "active",
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Prepare password reset request filter: filter by actor_type 'admin', sample search.
  const filterBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    actor_type: "admin" as const,
    // search: some partial or full adminEmail, eg: domain or name fragment
    search: adminEmail.split("@")[0].slice(0, 3),
    status: undefined,
    created_from: undefined,
    created_to: undefined,
    expires_from: undefined,
    expires_to: undefined,
    sort_by: "created_at",
    sort_order: "desc",
    consumed: undefined,
    email: undefined,
  } satisfies IShoppingPasswordReset.IRequest;

  // 3. Audit password reset requests with the filter
  const result: IPageIShoppingPasswordReset.ISummary =
    await api.functional.shopping.admin.passwordResets.index(connection, {
      body: filterBody,
    });
  typia.assert(result);

  // 4. Validate structure
  TestValidator.predicate(
    "pagination is valid",
    result.pagination.current >= 1 && result.pagination.limit <= 100,
  );
  TestValidator.predicate("data array is present", Array.isArray(result.data));
  result.data.forEach((item) => {
    typia.assert<IShoppingPasswordReset.ISummary>(item);
    TestValidator.equals(
      "actor_type is admin only (or admin_id present)",
      typeof item.shopping_admin_id,
      "string",
    );
    // check email is visible
    TestValidator.predicate(
      "admin view: request_email has value",
      typeof item.request_email === "string" && item.request_email.length > 0,
    );
    TestValidator.predicate(
      "created_at is ISO date-time",
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.created_at),
    );
  });
  // Optionally: test pagination by fetching next page
  const page2Body = {
    ...filterBody,
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
  };
  const result2 = await api.functional.shopping.admin.passwordResets.index(
    connection,
    {
      body: page2Body,
    },
  );
  typia.assert(result2);
  TestValidator.equals(
    "correct page number for next page",
    result2.pagination.current,
    2,
  );
}
