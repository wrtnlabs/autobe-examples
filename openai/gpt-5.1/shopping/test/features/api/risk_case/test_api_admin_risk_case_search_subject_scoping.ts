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
 * Verify subject-scoped admin risk case search.
 *
 * Business goal:
 *
 * - Confirm that the admin risk case search endpoint (PATCH
 *   /shoppingMall/admin/adminSearch/riskCases) correctly scopes results by the
 *   primary subject fields so investigators can rapidly pivot around a single
 *   customer or order.
 *
 * Scenario:
 *
 * 1. Bootstrap an admin using POST /auth/admin/join, relying on the SDK to attach
 *    the access token to the connection.
 * 2. Define two distinct primary subjects:
 *
 *    - Subject A: primary_subject_type = "customer" with its own UUID id and a
 *         human-readable display string.
 *    - Subject B: primary_subject_type = "order" with a different UUID and display
 *         string.
 * 3. As the admin, create several risk cases for each subject via POST
 *    /shoppingMall/admin/riskCases, ensuring that all cases for a given subject
 *    share the same primary_subject_type/primary_subject_id and that case_code
 *    values are unique.
 * 4. Call PATCH /shoppingMall/admin/adminSearch/riskCases with an
 *    IShoppingMallRiskCase.IRequest that filters by both primarySubjectType and
 *    primarySubjectId for Subject A and a sufficiently large page/limit.
 * 5. Assert that the returned page only contains summaries for Subject A:
 *
 *    - Every row has matching primary_subject_type and primary_subject_id.
 *    - At least one row carries the expected primary_subject_display string used for
 *         Subject A cases.
 *    - No row corresponds to any of the Subject B case ids or case_codes.
 * 6. Call the search again using only primarySubjectType = "customer" (no
 *    primarySubjectId) and assert that:
 *
 *    - All returned cases are of type "customer".
 *    - Cases belonging to Subject B (type "order") are excluded.
 * 7. Optionally, mirror that check by querying primarySubjectType = "order" and
 *    verifying that only Subject B cases appear.
 */
export async function test_api_admin_risk_case_search_subject_scoping(
  connection: api.IConnection,
) {
  // 1. Admin join & authentication
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized = await api.functional.auth.admin.join(connection, {
    body: adminJoinBody,
  });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare two distinct primary subjects
  const subjectAId = typia.random<string & tags.Format<"uuid">>();
  const subjectBId = typia.random<string & tags.Format<"uuid">>();

  const subjectAType = "customer";
  const subjectADisplay = `customer+${RandomGenerator.alphaNumeric(6)}@example.com`;

  const subjectBType = "order";
  const subjectBDisplay = `ORDER-${RandomGenerator.alphaNumeric(10)}`;

  // 3. Create multiple risk cases for each subject
  const subjectACases: IShoppingMallRiskCase[] = [];
  const subjectBCases: IShoppingMallRiskCase[] = [];

  const subjectASeverities = ["low", "medium", "high"] as const;
  const subjectAStatuses = ["open", "under_review", "closed"] as const;

  for (let i = 0; i < subjectASeverities.length; i++) {
    const createBody = {
      case_code: `CASE-A-${RandomGenerator.alphaNumeric(10)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 6 }),
      status: subjectAStatuses[i],
      severity: subjectASeverities[i],
      primary_subject_type: subjectAType,
      primary_subject_id: subjectAId,
      primary_subject_display: subjectADisplay,
      sla_due_at: null,
    } satisfies IShoppingMallRiskCase.ICreate;

    const created = await api.functional.shoppingMall.admin.riskCases.create(
      connection,
      { body: createBody },
    );
    typia.assert<IShoppingMallRiskCase>(created);
    subjectACases.push(created);
  }

  const subjectBSeverities = ["medium", "critical"] as const;
  const subjectBStatuses = ["open", "closed"] as const;

  for (let i = 0; i < subjectBSeverities.length; i++) {
    const createBody = {
      case_code: `CASE-B-${RandomGenerator.alphaNumeric(10)}`,
      title: RandomGenerator.paragraph({ sentences: 3 }),
      description: RandomGenerator.paragraph({ sentences: 4 }),
      status: subjectBStatuses[i],
      severity: subjectBSeverities[i],
      primary_subject_type: subjectBType,
      primary_subject_id: subjectBId,
      primary_subject_display: subjectBDisplay,
      sla_due_at: null,
    } satisfies IShoppingMallRiskCase.ICreate;

    const created = await api.functional.shoppingMall.admin.riskCases.create(
      connection,
      { body: createBody },
    );
    typia.assert<IShoppingMallRiskCase>(created);
    subjectBCases.push(created);
  }

  // Helper: collect ids and codes for exclusion checks
  const subjectAIds = subjectACases.map((c) => c.id);
  const subjectACodes = subjectACases.map((c) => c.case_code);
  const subjectBIds = subjectBCases.map((c) => c.id);
  const subjectBCodes = subjectBCases.map((c) => c.case_code);

  // 4. Search scoped by both primarySubjectType and primarySubjectId (Subject A)
  const scopedRequestA = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    primarySubjectType: subjectAType,
    primarySubjectId: subjectAId,
  } satisfies IShoppingMallRiskCase.IRequest;

  const scopedPageA =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: scopedRequestA },
    );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(scopedPageA);

  const scopedDataA = scopedPageA.data;

  TestValidator.predicate(
    "scoped search (type+id) should return at least one Subject A case",
    scopedDataA.length > 0,
  );

  TestValidator.predicate(
    "scoped search (type+id) must not exceed page limit",
    scopedDataA.length <= scopedPageA.pagination.limit,
  );

  for (const summary of scopedDataA) {
    TestValidator.equals(
      "each scoped result must match Subject A primary_subject_type",
      summary.primary_subject_type,
      subjectAType,
    );
    TestValidator.equals(
      "each scoped result must match Subject A primary_subject_id",
      summary.primary_subject_id,
      subjectAId,
    );

    TestValidator.predicate(
      "scoped results must not include Subject B ids",
      subjectBIds.indexOf(summary.id) === -1,
    );
    TestValidator.predicate(
      "scoped results must not include Subject B case_codes",
      subjectBCodes.indexOf(summary.case_code) === -1,
    );
  }

  const hasExpectedDisplayA = scopedDataA.some(
    (s) => s.primary_subject_display === subjectADisplay,
  );
  TestValidator.predicate(
    "at least one scoped result should carry Subject A display",
    hasExpectedDisplayA,
  );

  // 5. Search scoped only by primarySubjectType (Subject A type)
  const typeOnlyRequestA = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    primarySubjectType: subjectAType,
  } satisfies IShoppingMallRiskCase.IRequest;

  const typeOnlyPageA =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: typeOnlyRequestA },
    );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(typeOnlyPageA);

  const typeOnlyDataA = typeOnlyPageA.data;

  TestValidator.predicate(
    "type-only search for customer should return at least one case",
    typeOnlyDataA.length > 0,
  );

  for (const summary of typeOnlyDataA) {
    TestValidator.equals(
      "type-only search should only return customer-type cases",
      summary.primary_subject_type,
      subjectAType,
    );

    TestValidator.predicate(
      "type-only search for customer should not contain Subject B ids",
      subjectBIds.indexOf(summary.id) === -1,
    );
    TestValidator.predicate(
      "type-only search for customer should not contain Subject B codes",
      subjectBCodes.indexOf(summary.case_code) === -1,
    );
  }

  // 6. Optional mirror: type-only search for Subject B type (order)
  const typeOnlyRequestB = {
    page: 1 as number & tags.Type<"int32">,
    limit: 20 as number & tags.Type<"int32">,
    primarySubjectType: subjectBType,
  } satisfies IShoppingMallRiskCase.IRequest;

  const typeOnlyPageB =
    await api.functional.shoppingMall.admin.adminSearch.riskCases.index(
      connection,
      { body: typeOnlyRequestB },
    );
  typia.assert<IPageIShoppingMallRiskCase.ISummary>(typeOnlyPageB);

  const typeOnlyDataB = typeOnlyPageB.data;

  TestValidator.predicate(
    "type-only search for order should return at least one case",
    typeOnlyDataB.length > 0,
  );

  for (const summary of typeOnlyDataB) {
    TestValidator.equals(
      "type-only search for order should only return order-type cases",
      summary.primary_subject_type,
      subjectBType,
    );

    TestValidator.predicate(
      "type-only search for order should not contain Subject A ids",
      subjectAIds.indexOf(summary.id) === -1,
    );
    TestValidator.predicate(
      "type-only search for order should not contain Subject A codes",
      subjectACodes.indexOf(summary.case_code) === -1,
    );
  }
}
