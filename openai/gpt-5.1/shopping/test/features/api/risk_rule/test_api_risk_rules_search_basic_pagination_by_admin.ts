import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallRiskRule";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallRiskRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRiskRule";

/**
 * Validate basic pagination behavior for admin risk rule search.
 *
 * Business goal: Ensure that an authenticated shopping mall admin can retrieve
 * a paginated list of risk rule summaries via PATCH
 * /shoppingMall/admin/riskRules, and that pagination metadata is consistent
 * when the number of rules exceeds a single page.
 *
 * Steps:
 *
 * 1. Register and authenticate an admin using POST /auth/admin/join.
 * 2. Seed multiple risk rules using POST /shoppingMall/admin/riskRules.
 * 3. Call PATCH /shoppingMall/admin/riskRules with page=1, limit=10 and verify
 *    pagination metadata and data length constraints.
 * 4. If there are more than 10 records (pages > 1), request page=2 and verify that
 *    pagination metadata reflects the second page and that the result slice is
 *    consistent with the page size.
 */
export async function test_api_risk_rules_search_basic_pagination_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin registration & authentication via join
  const joinBody = typia.random<IShoppingMallAdminJoin.ICreate>();

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: joinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Seed multiple risk rules so that pagination is meaningful
  const pageLimit = 10;
  const seedCount = 15; // ensure more than one page when possible

  const createdRules: IShoppingMallRiskRule[] = [];

  await ArrayUtil.asyncForEach(
    ArrayUtil.repeat(seedCount, (index) => index),
    async (index) => {
      const createBody = {
        rule_code: `auto_pagination_${RandomGenerator.alphaNumeric(12)}`,
        name: RandomGenerator.paragraph({ sentences: 3 }),
        scope: "order",
        severity: RandomGenerator.pick([
          "low",
          "medium",
          "high",
          "critical",
        ] as const),
        expression_json: "{}",
        description: RandomGenerator.paragraph({ sentences: 5 }),
        is_enabled: true,
        applies_to_countries: null,
        effective_from: null,
        effective_until: null,
      } satisfies IShoppingMallRiskRule.ICreate;

      const created: IShoppingMallRiskRule =
        await api.functional.shoppingMall.admin.riskRules.create(connection, {
          body: createBody,
        });
      typia.assert<IShoppingMallRiskRule>(created);
      createdRules.push(created);
    },
  );

  // 3. Fetch first page with basic pagination options
  const firstPageRequest = {
    page: 1 as number & tags.Type<"int32">,
    limit: pageLimit as number & tags.Type<"int32">,
  } satisfies IShoppingMallRiskRule.IRequest;

  const firstPage: IPageIShoppingMallRiskRule.ISummary =
    await api.functional.shoppingMall.admin.riskRules.index(connection, {
      body: firstPageRequest,
    });
  typia.assert<IPageIShoppingMallRiskRule.ISummary>(firstPage);

  // Validate pagination metadata for page 1
  TestValidator.equals("page 1 current page", firstPage.pagination.current, 1);
  TestValidator.equals("page 1 limit", firstPage.pagination.limit, pageLimit);

  TestValidator.predicate(
    "total records should be at least seeded count",
    firstPage.pagination.records >= seedCount,
  );
  TestValidator.predicate(
    "total pages should be at least 1",
    firstPage.pagination.pages >= 1,
  );
  TestValidator.predicate(
    "page 1 data length must not exceed limit",
    firstPage.data.length <= pageLimit,
  );

  // 4. If more than one page, fetch the second page and validate
  if (firstPage.pagination.pages > 1) {
    const secondPageRequest = {
      page: 2 as number & tags.Type<"int32">,
      limit: pageLimit as number & tags.Type<"int32">,
    } satisfies IShoppingMallRiskRule.IRequest;

    const secondPage: IPageIShoppingMallRiskRule.ISummary =
      await api.functional.shoppingMall.admin.riskRules.index(connection, {
        body: secondPageRequest,
      });
    typia.assert<IPageIShoppingMallRiskRule.ISummary>(secondPage);

    TestValidator.equals(
      "page 2 current page",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "page 2 limit",
      secondPage.pagination.limit,
      pageLimit,
    );
    TestValidator.predicate(
      "page 2 data length must not exceed limit",
      secondPage.data.length <= pageLimit,
    );

    // Compare IDs between page 1 and page 2 to ensure paging slices
    const page1Ids = new Set(firstPage.data.map((rule) => rule.id));

    const hasNonOverlapping = secondPage.data.some(
      (rule) => !page1Ids.has(rule.id),
    );

    TestValidator.predicate(
      "page 2 should contain at least one rule not in page 1 when records exceed limit",
      hasNonOverlapping || firstPage.pagination.records <= pageLimit,
    );
  }
}
