import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministrator";
import type { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_administrator_business_rules_create } from "../../../generate/generate_random_ecommerce_administrator_business_rules_create";
import { prepare_random_ecommerce_platform_event_of_customer } from "../../../prepare/prepare_random_ecommerce_platform_event_of_customer";

export async function test_api_business_rule_search_comprehensive_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Setup admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123" satisfies string & tags.Format<"password">,
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Create test business rules with varying characteristics
  const ruleTypes = [
    "validation",
    "workflow",
    "calculation",
    "restriction",
  ] as const;
  const createdRules: IEcommercePlatformEventOfCustomer[] = [];
  // Create 5 rules with different types and statuses
  for (let i = 0; i < 5; i++) {
    const ruleType = RandomGenerator.pick(ruleTypes);
    const isActive = i % 2 === 0; // Alternate active/inactive
    const rule =
      await generate_random_ecommerce_administrator_business_rules_create(
        adminConnection,
        {
          body: {
            rule_code: `TEST_RULE_${i}_${RandomGenerator.alphaNumeric(4).toUpperCase()}`,
            rule_name: RandomGenerator.paragraph({
              sentences: 2,
              wordMin: 2,
              wordMax: 4,
            }),
            rule_description: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 3,
              sentenceMax: 5,
            }),
            rule_type: ruleType,
            configuration_json: JSON.stringify({ test: true, version: i + 1 }),
            is_active: isActive,
            execution_order: i + 1,
            version: `v${i + 1}.0.0`,
          } satisfies IEcommercePlatformEventOfCustomer.ICreate,
        },
      );
    typia.assert(rule);
    createdRules.push(rule);
  }
  // Test 1: Search all rules with default parameters
  const allRules =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {} satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(allRules);
  TestValidator.predicate(
    "should return pagination info",
    allRules.pagination.records >= 5,
  );
  // Test 2: Filter by exact rule_code
  const targetRule = createdRules[0];
  const byCode =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          rule_code: targetRule.rule_code,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(byCode);
  TestValidator.equals("should find exact rule by code", byCode.data.length, 1);
  TestValidator.equals(
    "matching rule code",
    byCode.data[0].rule_code,
    targetRule.rule_code,
  );
  // Test 3: Filter by rule_type
  const validationRules =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          rule_type: "validation",
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(validationRules);
  TestValidator.predicate(
    "should have validation rules",
    validationRules.data.length > 0,
  );
  TestValidator.predicate(
    "all should be validation type",
    validationRules.data.every((rule) => rule.rule_type === "validation"),
  );
  // Test 4: Filter by is_active status
  const activeRules =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          is_active: true,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(activeRules);
  TestValidator.predicate(
    "should have active rules",
    activeRules.data.length > 0,
  );
  TestValidator.predicate(
    "all should be active",
    activeRules.data.every((rule) => rule.is_active === true),
  );
  // Test 5: Text search in rule_description
  const searchKeyword = createdRules[0].rule_description.substring(0, 10);
  const searchedRules =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          search: searchKeyword,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(searchedRules);
  TestValidator.predicate(
    "should find rules with search term",
    searchedRules.data.length > 0,
  );
  // Test 6: Pagination with custom page size
  const paginated =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          page: 1,
          limit: 2,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(paginated);
  TestValidator.equals(
    "page limit should be respected",
    paginated.data.length,
    2,
  );
  TestValidator.equals(
    "current page should be 1",
    paginated.pagination.current,
    1,
  );
  // Test 7: Verify summary information (no configuration_json)
  const sampleRule = validationRules.data[0];
  TestValidator.predicate(
    "should have id",
    typeof sampleRule.id === "string" && sampleRule.id.length > 0,
  );
  TestValidator.predicate(
    "should have rule_code",
    typeof sampleRule.rule_code === "string",
  );
  TestValidator.predicate(
    "should have rule_name",
    typeof sampleRule.rule_name === "string",
  );
  TestValidator.predicate(
    "should have rule_description",
    typeof sampleRule.rule_description === "string",
  );
  TestValidator.predicate(
    "should have rule_type",
    typeof sampleRule.rule_type === "string",
  );
  TestValidator.predicate(
    "should have is_active",
    typeof sampleRule.is_active === "boolean",
  );
  TestValidator.predicate(
    "should have execution_order",
    typeof sampleRule.execution_order === "number",
  );
  TestValidator.predicate(
    "should have created_at",
    typeof sampleRule.created_at === "string",
  );
  TestValidator.predicate(
    "should have updated_at",
    typeof sampleRule.updated_at === "string",
  );
  // Test 8: Verify default sorting by execution_order
  const allRulesSorted =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          limit: 10,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(allRulesSorted);
  // Check if rules are ordered by execution_order (assuming created rules have sequential order)
  for (let i = 1; i < allRulesSorted.data.length; i++) {
    TestValidator.predicate(
      "should be sorted by execution_order",
      allRulesSorted.data[i].execution_order >=
        allRulesSorted.data[i - 1].execution_order,
    );
  }
}
