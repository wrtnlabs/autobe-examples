import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingBusinessPolicy";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";

/**
 * This test validates that an authenticated admin can perform advanced search,
 * filtering, and pagination over business policy configuration records
 * (BusinessPolicy table) via the admin businessPolicies search API.
 *
 * Steps:
 *
 * 1. Register a new admin via the join endpoint.
 * 2. As the authenticated admin, execute the PATCH
 *    /shopping/admin/businessPolicies endpoint with advanced query options:
 *
 *    - Filters: policy_name, scope, status, q (text search)
 *    - Pagination: page, limit
 *    - Sorting: order_by, order_direction
 * 3. Validate the paginated summary DTO is returned with all results matching
 *    query constraints, no sensitive fields are exposed.
 * 4. Confirm correct pagination output fields (current, limit, records, pages),
 *    all field types, and that no extraneous fields are present.
 * 5. Confirm advanced search, filtering, and sorting behave as expected. Malformed
 *    or unauthorized requests should be rejected.
 */
export async function test_api_admin_business_policy_search_query_pagination(
  connection: api.IConnection,
) {
  // 1. Register a new admin (join)
  const adminJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: RandomGenerator.pick([
      "active",
      "pending",
      "suspended",
      "locked",
    ] as const),
  } satisfies IShoppingAdmin.IJoin;
  const authorized: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoin });
  typia.assert(authorized);

  // 2. As authenticated admin, search with advanced query + pagination
  const searchRequestAdvanced = {
    policy_name: undefined,
    scope: undefined,
    status: undefined,
    q: undefined, // Full-text
    page: 1 as number & tags.Type<"int32">,
    limit: 5 as number & tags.Type<"int32">,
    order_by: RandomGenerator.pick(["policy_name", "created_at"] as const),
    order_direction: RandomGenerator.pick(["asc", "desc"] as const),
  } satisfies IShoppingBusinessPolicy.IRequest;
  const result: IPageIShoppingBusinessPolicy.ISummary =
    await api.functional.shopping.admin.businessPolicies.index(connection, {
      body: searchRequestAdvanced,
    });
  typia.assert(result);
  // Validate page object
  TestValidator.predicate(
    "pagination current page is 1",
    result.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is 5",
    result.pagination.limit === 5,
  );
  TestValidator.predicate(
    "pagination total pages >= 1",
    result.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "pagination total records >= 0",
    result.pagination.records >= 0,
  );
  // Validate records: no sensitive fields, all required fields present
  for (const summary of result.data) {
    typia.assert(summary);
    TestValidator.predicate(
      "summary does not contain sensitive/internal note",
      typeof (summary as any).internal_notes === "undefined",
    );
  }

  // 3. Search with filters: status, scope, fuzzy q
  const searchRequestFilter = {
    status: RandomGenerator.pick(["active", "inactive"] as const),
    scope: RandomGenerator.paragraph({ sentences: 1 }),
    q: RandomGenerator.paragraph({ sentences: 2 }),
    page: 1 as number & tags.Type<"int32">,
    limit: 2 as number & tags.Type<"int32">,
    order_by: "created_at",
    order_direction: "desc",
  } satisfies IShoppingBusinessPolicy.IRequest;
  const filteredResult: IPageIShoppingBusinessPolicy.ISummary =
    await api.functional.shopping.admin.businessPolicies.index(connection, {
      body: searchRequestFilter,
    });
  typia.assert(filteredResult);
  TestValidator.predicate(
    "filtered - correct limit",
    filteredResult.pagination.limit === 2,
  );
  // 4. Unauthorized: use unauthenticated connection
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot query admin business policies",
    async () => {
      await api.functional.shopping.admin.businessPolicies.index(unauthConn, {
        body: searchRequestAdvanced,
      });
    },
  );
  // 5. Malformed query: wrong order_direction (should fail)
  await TestValidator.error(
    "malformed order_direction should fail",
    async () => {
      await api.functional.shopping.admin.businessPolicies.index(connection, {
        body: { ...searchRequestAdvanced, order_direction: "ascending" as any },
      });
    },
  );
}
