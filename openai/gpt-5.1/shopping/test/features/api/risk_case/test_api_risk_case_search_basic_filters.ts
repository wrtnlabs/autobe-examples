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
 * Search risk cases by basic status and severity filters with pagination.
 *
 * Business goal
 *
 * - Verify that an authenticated admin can search risk cases using simple filters
 *   (status, severity) and receive a paginated list of matching summaries.
 * - Ensure that risk cases created with different (status, severity) combinations
 *   are filtered correctly, and that pagination metadata in the response
 *   reflects the requested page and limit.
 *
 * Test steps
 *
 * 1. Register an admin using POST /auth/admin/join and rely on the SDK to attach
 *    the access token to the connection headers.
 * 2. Seed several risk cases using POST /shoppingMall/admin/riskCases with
 *    IShoppingMallRiskCase.ICreate payloads:
 *
 *    - At least two cases with status="open" and severity="high".
 *    - At least one case with status="closed" and severity="low".
 *    - Use different primary_subject_type and primary_subject_id values so filter
 *         behavior is not affected by collisions.
 * 3. Call PATCH /shoppingMall/admin/riskCases via
 *    api.functional.shoppingMall.admin.riskCases.index with an
 *    IShoppingMallRiskCase.IRequest body that sets:
 *
 *    - Status: "open"
 *    - Severity: "high"
 *    - Page and limit to a small page size (e.g., page=1, limit=2).
 * 4. Validate that:
 *
 *    - The response matches IPageIShoppingMallRiskCase.ISummary (using
 *         typia.assert).
 *    - Pagination.current equals the requested page value.
 *    - Pagination.limit equals the requested limit value.
 *    - Every element in data has status==="open" and severity==="high".
 *    - None of the seeded non-matching cases (e.g., closed/low) appear in the data
 *         page.
 */
export async function test_api_risk_case_search_basic_filters(
  connection: api.IConnection,
) {
  // 1. Register an admin and let SDK attach Authorization header
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Seed risk cases with different status/severity combinations
  const subjectIdOpenHigh1 = typia.random<string & tags.Format<"uuid">>();
  const subjectIdOpenHigh2 = typia.random<string & tags.Format<"uuid">>();
  const subjectIdClosedLow = typia.random<string & tags.Format<"uuid">>();

  const openHighCase1 =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: {
        case_code: `OPEN-HIGH-1-${RandomGenerator.alphaNumeric(8)}`,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "open",
        severity: "high",
        primary_subject_type: "customer",
        primary_subject_id: subjectIdOpenHigh1,
        primary_subject_display: RandomGenerator.name(2),
        sla_due_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
      } satisfies IShoppingMallRiskCase.ICreate,
    });
  typia.assert(openHighCase1);

  const openHighCase2 =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: {
        case_code: `OPEN-HIGH-2-${RandomGenerator.alphaNumeric(8)}`,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "open",
        severity: "high",
        primary_subject_type: "seller",
        primary_subject_id: subjectIdOpenHigh2,
        primary_subject_display: RandomGenerator.name(2),
        sla_due_at: new Date(Date.now() + 48 * 60 * 60 * 1000).toISOString(),
      } satisfies IShoppingMallRiskCase.ICreate,
    });
  typia.assert(openHighCase2);

  const closedLowCase =
    await api.functional.shoppingMall.admin.riskCases.create(connection, {
      body: {
        case_code: `CLOSED-LOW-${RandomGenerator.alphaNumeric(8)}`,
        title: RandomGenerator.paragraph({ sentences: 3 }),
        description: RandomGenerator.content({ paragraphs: 1 }),
        status: "closed",
        severity: "low",
        primary_subject_type: "order",
        primary_subject_id: subjectIdClosedLow,
        primary_subject_display: RandomGenerator.name(2),
        sla_due_at: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString(),
      } satisfies IShoppingMallRiskCase.ICreate,
    });
  typia.assert(closedLowCase);

  // 3. Search for open/high risk cases with pagination
  const page = 1;
  const limit = 2;

  const searchRequest = {
    page,
    limit,
    status: "open",
    severity: "high",
  } satisfies IShoppingMallRiskCase.IRequest;

  const pageResult: IPageIShoppingMallRiskCase.ISummary =
    await api.functional.shoppingMall.admin.riskCases.index(connection, {
      body: searchRequest,
    });
  typia.assert(pageResult);

  const pagination = pageResult.pagination;
  TestValidator.equals(
    "pagination current page should match request",
    pagination.current,
    page,
  );
  TestValidator.equals(
    "pagination limit should match request",
    pagination.limit,
    limit,
  );

  // 4. Validate filter correctness on returned data
  const data = pageResult.data;

  await TestValidator.predicate(
    "all returned cases must be open/high",
    async () => {
      for (const summary of data) {
        if (summary.status !== "open" || summary.severity !== "high")
          return false;
      }
      return true;
    },
  );

  await TestValidator.predicate(
    "closed/low case must not be in search results",
    async () => data.every((item) => item.id !== closedLowCase.id),
  );
}
