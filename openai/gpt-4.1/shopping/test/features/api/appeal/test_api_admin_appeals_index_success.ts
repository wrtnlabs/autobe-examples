import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingAppeal";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAppeal";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";

/**
 * Test that an admin can search and retrieve paginated, filtered list of all
 * appeals.
 *
 * Validates:
 *
 * 1. Admin is registered and authenticated for privileged appeal search.
 * 2. Appeal list is returned successfully when filters for status/type/date are
 *    provided.
 * 3. Result adheres to administrator scope and correct pagination/sorting.
 * 4. API returns a response conforming to IPageIShoppingAppeal.ISummary DTO.
 *
 * Steps:
 *
 * 1. Register a new admin account (prerequisite for authentication).
 * 2. Test /shopping/admin/appeals with full/partial filters and valid input.
 * 3. Validate response structure, business logic and pagination.
 */
export async function test_api_admin_appeals_index_success(
  connection: api.IConnection,
) {
  // 1. Register admin for authentication
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    role: RandomGenerator.pick([
      "super",
      "support",
      "compliance",
      "operator",
    ] as const),
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Prepare advanced filters for appeal search
  // Generate random/status/type/filer_actor_type filters
  const filters: IShoppingAppeal.IRequest[] = [
    {
      status: RandomGenerator.pick([
        "filed",
        "under_review",
        "approved",
        "rejected",
        "closed",
        "escalated",
      ] as const),
      type: RandomGenerator.pick([
        "suspension",
        "policy_violation",
        "account_action",
      ] as const),
      filer_actor_type: RandomGenerator.pick([
        "customer",
        "seller",
        "admin",
      ] as const),
      page: 1,
      limit: 10,
      sort_by: RandomGenerator.pick([
        "created_at",
        "status",
        "decision_at",
      ] as const),
      sort_direction: RandomGenerator.pick(["asc", "desc"] as const),
    },
    {
      // Partial filter - date range only
      created_from: new Date(
        Date.now() - 1000 * 60 * 60 * 24 * 30,
      ).toISOString(), // 30 days ago
      created_to: new Date().toISOString(),
      page: 1,
      limit: 5,
    },
    {
      // Empty filter - all results scoped by admin
      page: 1,
      limit: 20,
    },
  ];

  // 3. Test each filter, validate paginated response
  for (const idx in filters) {
    const req = filters[idx as any];
    const res: IPageIShoppingAppeal.ISummary =
      await api.functional.shopping.admin.appeals.index(connection, {
        body: req,
      });
    typia.assert(res);
    // Check pagination info
    TestValidator.predicate(
      `pagination present on response #${idx}`,
      res.pagination !== undefined &&
        typeof res.pagination.current === "number" &&
        typeof res.pagination.limit === "number",
    );
    // Validate that data is an array
    TestValidator.predicate(
      `appeal data is array on response #${idx}`,
      Array.isArray(res.data),
    );
    // Validate each item matches ISummary
    for (const a of res.data) {
      typia.assert<IShoppingAppeal.ISummary>(a);
      TestValidator.predicate(
        `appeal summary must have id for response #${idx}`,
        typeof a.id === "string" && a.id.length > 0,
      );
      TestValidator.predicate(
        `appeal summary status valid for response #${idx}`,
        typeof a.status === "string" && a.status.length > 0,
      );
      TestValidator.predicate(
        `appeal summary type valid for response #${idx}`,
        typeof a.type === "string" && a.type.length > 0,
      );
    }
  }
}
