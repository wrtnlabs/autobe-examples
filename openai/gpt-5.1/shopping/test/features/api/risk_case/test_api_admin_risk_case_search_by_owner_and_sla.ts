import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskCase";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskCase } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskCase";

/**
 * Validate owner-based SLA-centric risk case search for admins.
 *
 * Business goals:
 *
 * - Ensure that PATCH /shoppingMall/admin/adminSearch/riskCases can build
 *   owner-specific risk queues using `ownerAdminId`.
 * - Verify that createdFrom/createdTo properly constrain the result set.
 * - Confirm that sorting by `sla_due_at` in ascending order surfaces the earliest
 *   SLA deadlines first among non-null values.
 * - Demonstrate that different admins see disjoint sets of risk cases when
 *   searching by their own ownerAdminId.
 *
 * Scenario steps:
 *
 * 1. Join Admin A using POST /auth/admin/join, capturing its admin id from
 *    IShoppingMallAdmin.IAuthorized. The connection now carries Admin A’s
 *    Authorization header.
 * 2. As Admin A, create multiple risk cases via POST /shoppingMall/admin/riskCases
 *    using IShoppingMallRiskCase.ICreate payloads. Give them distinct
 *    case_code/title values and different sla_due_at timestamps (soon, later,
 *    and null) while keeping created_at in a narrow time window.
 * 3. Join Admin B using POST /auth/admin/join, capturing its id. This call updates
 *    the connection Authorization header to Admin B.
 * 4. As Admin B, create additional risk cases with their own case_code/title and
 *    sla_due_at variations (including non-null and null), so that some cases
 *    clearly belong to Admin B.
 * 5. Call PATCH /shoppingMall/admin/adminSearch/riskCases with an
 *    IShoppingMallRiskCase.IRequest body that:
 *
 *    - Sets ownerAdminId to Admin A’s id.
 *    - Uses createdFrom/createdTo to cover the time window in which all test cases
 *         were created.
 *    - Sets sortBy = "sla_due_at" and sortOrder = "asc".
 * 6. Assert that:
 *
 *    - No risk case that was created in the Admin B phase (adminBIds) appears in the
 *         Admin A search results.
 *    - At least one of the Admin A cases appears in the Admin A search results,
 *         proving the ownership filter is active.
 *    - Among results that have non-null sla_due_at, those timestamps are in
 *         ascending order, ensuring SLA-centric sort behavior.
 * 7. Perform a second search for Admin B by calling the same PATCH endpoint with
 *    ownerAdminId set to Admin B’s id, and assert that:
 *
 *    - No Admin A cases appear.
 *    - At least one Admin B case appears (when any exist).
 */
export async function test_api_admin_risk_case_search_by_owner_and_sla(
  connection: api.IConnection,
) {
  // 1. Join Admin A
  const adminAJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminAJoinBody,
    });
  typia.assert(adminAAuth);

  const adminAId = adminAAuth.id;

  // 2. Admin A creates several risk cases with different sla_due_at values
  const now = new Date();
  const soon = new Date(now.getTime() + 10 * 60 * 1000).toISOString();
  const later = new Date(now.getTime() + 60 * 60 * 1000).toISOString();

  const adminARiskCases: IShoppingMallRiskCase[] = [];

  const adminACaseBodies: IShoppingMallRiskCase.ICreate[] = [
    {
      case_code: `A-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: "open",
      severity: "high",
      primary_subject_type: "order",
      primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
      primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
      sla_due_at: soon,
    },
    {
      case_code: `A-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: "open",
      severity: "medium",
      primary_subject_type: "order",
      primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
      primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
      sla_due_at: later,
    },
    {
      case_code: `A-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: "open",
      severity: "low",
      primary_subject_type: "order",
      primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
      primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
      sla_due_at: null,
    },
  ];

  for (const body of adminACaseBodies) {
    const created: IShoppingMallRiskCase =
      await api.functional.shoppingMall.admin.riskCases.create(connection, {
        body,
      });
    typia.assert(created);
    adminARiskCases.push(created);
  }

  // 3. Join Admin B (connection Authorization becomes Admin B)
  const adminBJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminBAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBJoinBody,
    });
  typia.assert(adminBAuth);

  const adminBId = adminBAuth.id;

  // 4. Admin B creates additional risk cases
  const adminBRiskCases: IShoppingMallRiskCase[] = [];

  const adminBCaseBodies: IShoppingMallRiskCase.ICreate[] = [
    {
      case_code: `B-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: "open",
      severity: "high",
      primary_subject_type: "customer",
      primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
      primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
      sla_due_at: new Date(now.getTime() + 30 * 60 * 1000).toISOString(),
    },
    {
      case_code: `B-${RandomGenerator.alphaNumeric(8)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: "open",
      severity: "medium",
      primary_subject_type: "customer",
      primary_subject_id: typia.random<string & tags.Format<"uuid">>(),
      primary_subject_display: RandomGenerator.paragraph({ sentences: 2 }),
      sla_due_at: null,
    },
  ];

  for (const body of adminBCaseBodies) {
    const created: IShoppingMallRiskCase =
      await api.functional.shoppingMall.admin.riskCases.create(connection, {
        body,
      });
    typia.assert(created);
    adminBRiskCases.push(created);
  }

  // Build createdAt window: from a bit before now to a bit after
  const createdFrom = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const createdTo = new Date(now.getTime() + 2 * 60 * 60 * 1000).toISOString();

  // 5. Search for Admin A cases
  const adminASearchBody = {
    page: 1,
    limit: 20,
    ownerAdminId: adminAId,
    createdFrom,
    createdTo,
    sortBy: "sla_due_at",
    sortOrder: "asc",
  } satisfies IShoppingMallRiskCase.IRequest;

  const adminASearchResult: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: adminASearchBody },
    );
  typia.assert(adminASearchResult);

  const adminAIds = new Set(adminARiskCases.map((c) => c.id));
  const adminBIds = new Set(adminBRiskCases.map((c) => c.id));

  // 6a. Assert that all returned cases are not from Admin B set
  for (const summary of adminASearchResult.data) {
    TestValidator.predicate(
      "admin A search should not return admin B cases",
      !adminBIds.has(summary.id),
    );
  }

  // 6b. Assert that at least one Admin A case appears (sanity check)
  TestValidator.predicate(
    "admin A search should return at least one of admin A's cases",
    adminASearchResult.data.some((s) => adminAIds.has(s.id)),
  );

  // 6c. Assert sla_due_at ascending order among non-null values
  const nonNullSla = adminASearchResult.data
    .map((s) => s.sla_due_at)
    .filter(
      (v): v is string & tags.Format<"date-time"> =>
        v !== null && v !== undefined,
    );

  for (let i = 1; i < nonNullSla.length; i++) {
    const prevTime = new Date(nonNullSla[i - 1]).getTime();
    const currTime = new Date(nonNullSla[i]).getTime();
    TestValidator.predicate(
      "sla_due_at values must be in ascending order",
      prevTime <= currTime,
    );
  }

  // 7. Search for Admin B cases
  const adminBSearchBody = {
    page: 1,
    limit: 20,
    ownerAdminId: adminBId,
    createdFrom,
    createdTo,
    sortBy: "sla_due_at",
    sortOrder: "asc",
  } satisfies IShoppingMallRiskCase.IRequest;

  const adminBSearchResult: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: adminBSearchBody },
    );
  typia.assert(adminBSearchResult);

  // 7a. Admin B search should not contain Admin A cases
  for (const summary of adminBSearchResult.data) {
    TestValidator.predicate(
      "admin B search should not return admin A cases",
      !adminAIds.has(summary.id),
    );
  }

  // 7b. Sanity: at least one Admin B case appears if any exist
  if (adminBRiskCases.length > 0) {
    TestValidator.predicate(
      "admin B search should return at least one of admin B's cases",
      adminBSearchResult.data.some((s) => adminBIds.has(s.id)),
    );
  }
}
