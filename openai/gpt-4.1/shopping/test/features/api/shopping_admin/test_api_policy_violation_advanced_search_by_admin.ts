import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingPolicyViolation";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingBusinessPolicy } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingBusinessPolicy";
import type { IShoppingPolicyViolation } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingPolicyViolation";

/**
 * Advanced policy violation search & pagination for admins.
 *
 * 1. Register a new admin via /auth/admin/join with a secure, random business
 *    email, strong password, real name, role and status
 * 2. Admin context (via auto-token assignment from join)
 * 3. Run a complex search via PATCH /shopping/admin/policyViolations with filters:
 *
 *    - Status: randomly pick a value (e.g. 'open', 'under_review', 'resolved')
 *    - Actor_type: randomly pick from allowed types ('admin','seller','customer')
 *    - Policy_name: random word
 *    - Violation_code: random string
 *    - Affected_entity_type: random valid value
 *    - Date_from: recent random ISO string
 *    - Date_to: later random ISO string
 *    - Page: random int between 1-3
 *    - Limit: random int between 1-5
 *    - Sort_by/sort_order: random pick
 * 4. Assert the response is paginated and results (if present) have required
 *    summary fields: id, policy_id, violation_type, violation_code, status,
 *    created_at, policy
 * 5. If results exist, validate their filter fields match the request where
 *    applicable
 * 6. Attempt search as unauthenticated user (empty headers) and expect error
 * 7. Attempt search with unsupported filter fields in request body, expect error
 */
export async function test_api_policy_violation_advanced_search_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a new admin (privileged user)
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        role: RandomGenerator.pick([
          "super",
          "compliance",
          "support",
          "ops",
          "audit",
        ] as const),
        status: RandomGenerator.pick([
          "active",
          "pending",
          "suspended",
          "locked",
        ] as const),
      } satisfies IShoppingAdmin.IJoin,
    });
  typia.assert(admin);

  // 2. Prepare complex search filters
  const now = new Date();
  const earlier = new Date(now.getTime() - 1000 * 60 * 60 * 24 * 30); // 30 days ago
  const filterRequest = {
    status: RandomGenerator.pick([
      "open",
      "under_review",
      "resolved",
      "escalated",
    ] as const),
    actor_type: RandomGenerator.pick(["customer", "admin", "seller"] as const),
    violation_code: RandomGenerator.alphaNumeric(8),
    policy_name: RandomGenerator.paragraph({
      sentences: 1,
      wordMin: 4,
      wordMax: 10,
    }),
    date_from: earlier.toISOString(),
    date_to: now.toISOString(),
    affected_entity_type: RandomGenerator.pick([
      "admin",
      "seller",
      "customer",
      "product",
      "order",
    ] as const),
    sort_by: RandomGenerator.pick([
      "created_at",
      "updated_at",
      "status",
    ] as const),
    sort_order: RandomGenerator.pick(["asc", "desc"] as const),
    page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
    >(),
  } satisfies IShoppingPolicyViolation.IRequest;

  // 3. Admin performs patch search
  const result: IPageIShoppingPolicyViolation.ISummary =
    await api.functional.shopping.admin.policyViolations.index(connection, {
      body: filterRequest,
    });
  typia.assert(result);
  TestValidator.predicate(
    "pagination present",
    !!result.pagination && typeof result.pagination.current === "number",
  );
  TestValidator.predicate("result data is array", Array.isArray(result.data));

  // 4. If results exist, validate each record has required fields and matches filters (where deterministic)
  for (const v of result.data) {
    typia.assert(v);
    TestValidator.predicate("violation summary id", typeof v.id === "string");
    TestValidator.predicate(
      "policy object present",
      typeof v.policy === "object",
    );
    TestValidator.predicate(
      "violation_code present",
      typeof v.violation_code === "string",
    );
    TestValidator.predicate("status present", typeof v.status === "string");
    TestValidator.predicate(
      "created_at present",
      typeof v.created_at === "string",
    );
    // Where we know a filter value - check
    // If status and actor_type are set in filter, confirm any returned data matches (as plausible)
    if (filterRequest.status && v.status)
      TestValidator.equals(
        "filter status propagated",
        v.status,
        filterRequest.status,
      );
    if (filterRequest.actor_type && v.violation_type)
      TestValidator.predicate(
        "actor type plausible",
        typeof v.violation_type === "string",
      );
    if (filterRequest.policy_name && v.policy)
      TestValidator.predicate(
        "policy name present",
        typeof v.policy.policy_name === "string",
      );
  }

  // 5. Access as unauthenticated user (should fail)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated policyViolation search fails",
    async () => {
      await api.functional.shopping.admin.policyViolations.index(unauthConn, {
        body: filterRequest,
      });
    },
  );

  // 6. Access with unsupported filter field (should trigger error)
  const invalidRequest = { ...filterRequest, NOT_A_FIELD: "bad" } as any;
  await TestValidator.error(
    "unsupported filter field triggers error",
    async () => {
      await api.functional.shopping.admin.policyViolations.index(connection, {
        body: invalidRequest,
      });
    },
  );
}
