import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallFraudRuleDefinition";
import type { IShoppingMallFraudRuleDefinition } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallFraudRuleDefinition";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";

export async function test_api_platform_admin_fraud_rule_definitions_pagination_and_sorting(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform admin
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.console.example.com/join",
    referrer: "https://admin.console.example.com/login",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const admin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create 25 fraud rule definitions with different ruleCode and names
  const totalRules = 25;
  const createdRules: IShoppingMallFraudRuleDefinition[] = [];

  for (let i = 0; i < totalRules; i++) {
    const indexStr = (i + 1).toString().padStart(3, "0");
    const createBody = {
      ruleCode: `RULE_${indexStr}`,
      name: `Fraud Rule ${indexStr}`,
      description: RandomGenerator.paragraph({ sentences: 3 }),
      scope: "order",
      severity: RandomGenerator.pick([
        "low",
        "medium",
        "high",
        "critical",
      ] as const),
      ruleExpression: JSON.stringify({
        type: "threshold",
        field: "order_amount",
        operator: ">",
        value: 10000 + i,
      }),
      isEnabled: i % 2 === 0,
    } satisfies IShoppingMallFraudRuleDefinition.ICreate;

    const created =
      await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.create(
        connection,
        {
          body: createBody,
        },
      );
    typia.assert(created);
    createdRules.push(created);
  }

  // Ensure we created the expected number of rules
  TestValidator.equals(
    "created rule count should be 25",
    createdRules.length,
    totalRules,
  );

  // Helper to assert page shape and ordering
  const assertPage = (
    label: string,
    page: IPageIShoppingMallFraudRuleDefinition.ISummary,
  ) => {
    typia.assert(page.pagination);
    typia.assert(page.data);

    // Data length should not exceed limit and be > 0 when records > 0
    TestValidator.predicate(
      `${label} - page size within limit`,
      page.data.length <= page.pagination.limit,
    );

    if (page.pagination.records > 0) {
      TestValidator.predicate(
        `${label} - page has non-negative size`,
        page.data.length >= 0,
      );
    }

    // Verify ordering by updated_at desc within page
    for (let i = 1; i < page.data.length; i++) {
      const prev = page.data[i - 1];
      const curr = page.data[i];
      TestValidator.predicate(
        `${label} - updated_at descending within page index ${i}`,
        prev.updated_at >= curr.updated_at,
      );
    }
  };

  // 3. Fetch first page: limit=10, default page (1-based in request, but omitted -> server default)
  const firstPageRequest = {
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "updated_at",
    sort_order: "desc" as const,
  } satisfies IShoppingMallFraudRuleDefinition.IRequest;

  const firstPage: IPageIShoppingMallFraudRuleDefinition.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.index(
      connection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPage);
  assertPage("first page", firstPage);

  // Validate pagination metadata for first page
  TestValidator.equals(
    "first page - current index should be 0",
    firstPage.pagination.current,
    0,
  );
  TestValidator.equals(
    "first page - limit should be 10",
    firstPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "first page - records should be 25",
    firstPage.pagination.records,
    totalRules,
  );
  TestValidator.equals(
    "first page - pages should be 3",
    firstPage.pagination.pages,
    3,
  );
  TestValidator.equals(
    "first page - data length should be 10",
    firstPage.data.length,
    10,
  );

  // 4. Fetch second page: page=2 (1-based)
  const secondPageRequest = {
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "updated_at",
    sort_order: "desc" as const,
  } satisfies IShoppingMallFraudRuleDefinition.IRequest;

  const secondPage: IPageIShoppingMallFraudRuleDefinition.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.index(
      connection,
      {
        body: secondPageRequest,
      },
    );
  typia.assert(secondPage);
  assertPage("second page", secondPage);

  TestValidator.equals(
    "second page - current index should be 1",
    secondPage.pagination.current,
    1,
  );
  TestValidator.equals(
    "second page - limit should be 10",
    secondPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "second page - records should be 25",
    secondPage.pagination.records,
    totalRules,
  );
  TestValidator.equals(
    "second page - pages should be 3",
    secondPage.pagination.pages,
    3,
  );
  TestValidator.equals(
    "second page - data length should be 10",
    secondPage.data.length,
    10,
  );

  // 5. Fetch third page: page=3 (1-based)
  const thirdPageRequest = {
    page: 3 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number & tags.Type<"int32"> & tags.Minimum<1>,
    sort_by: "updated_at",
    sort_order: "desc" as const,
  } satisfies IShoppingMallFraudRuleDefinition.IRequest;

  const thirdPage: IPageIShoppingMallFraudRuleDefinition.ISummary =
    await api.functional.shoppingMall.platformAdmin.fraudRuleDefinitions.index(
      connection,
      {
        body: thirdPageRequest,
      },
    );
  typia.assert(thirdPage);
  assertPage("third page", thirdPage);

  TestValidator.equals(
    "third page - current index should be 2",
    thirdPage.pagination.current,
    2,
  );
  TestValidator.equals(
    "third page - limit should be 10",
    thirdPage.pagination.limit,
    10,
  );
  TestValidator.equals(
    "third page - records should be 25",
    thirdPage.pagination.records,
    totalRules,
  );
  TestValidator.equals(
    "third page - pages should be 3",
    thirdPage.pagination.pages,
    3,
  );
  TestValidator.equals(
    "third page - data length should be 5",
    thirdPage.data.length,
    5,
  );

  // 6. Validate global ordering and no overlap/omission
  const allSummaries: IShoppingMallFraudRuleDefinition.ISummary[] = [
    ...firstPage.data,
    ...secondPage.data,
    ...thirdPage.data,
  ];

  TestValidator.equals(
    "total collected summaries should be 25",
    allSummaries.length,
    totalRules,
  );

  // Global ordering by updated_at descending
  for (let i = 1; i < allSummaries.length; i++) {
    const prev = allSummaries[i - 1];
    const curr = allSummaries[i];
    TestValidator.predicate(
      `global - updated_at descending between index ${i - 1} and ${i}`,
      prev.updated_at >= curr.updated_at,
    );
  }

  // Ensure IDs are unique across all pages
  const idSet = new Set<string>();
  for (const summary of allSummaries) {
    TestValidator.predicate(
      "each summary id should be unique across pages",
      idSet.has(summary.id) === false,
    );
    idSet.add(summary.id);
  }
}
