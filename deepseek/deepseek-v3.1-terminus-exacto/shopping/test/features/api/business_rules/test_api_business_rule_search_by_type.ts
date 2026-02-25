import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformEventOfCustomer";
import type { IEcommerceSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommercePlatformEventOfCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommercePlatformEventOfCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_business_rule_search_by_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super Administrator Setup
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_super_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  // Define possible rule types to test
  const ruleTypes = [
    "validation",
    "workflow",
    "calculation",
    "restriction",
  ] as const;
  for (const ruleType of ruleTypes) {
    // 2. Test search with specific rule type
    const searchBody: IEcommercePlatformEventOfCustomer.IRequest = {
      rule_type: ruleType,
      page: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1>
      >() satisfies number as number,
      limit: typia.random<
        number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
      >() satisfies number as number,
    };
    const result =
      await api.functional.ecommerce.superAdministrator.business_rules.index(
        adminConnection,
        { body: searchBody },
      );
    typia.assert(result);
    // 3. Validate pagination metadata
    TestValidator.equals(
      `pagination limit matches limit for rule type ${ruleType}`,
      result.pagination.limit,
      searchBody.limit!,
    );
    TestValidator.predicate(
      `pagination current page is valid for rule type ${ruleType}`,
      result.pagination.current >= 1,
    );
    TestValidator.predicate(
      `pagination records count is non-negative for rule type ${ruleType}`,
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      `pagination pages count is non-negative for rule type ${ruleType}`,
      result.pagination.pages >= 0,
    );
    // 4. Validate all returned rules match the requested filter
    for (const rule of result.data) {
      TestValidator.equals(
        `rule type matches filter ${ruleType}`,
        rule.rule_type,
        ruleType,
      );
      // Validate all required fields are present (typia.assert already validates types)
      TestValidator.predicate(
        `rule has valid id for rule type ${ruleType}`,
        typeof rule.id === "string" && rule.id.length > 0,
      );
      TestValidator.predicate(
        `rule has rule_code for rule type ${ruleType}`,
        typeof rule.rule_code === "string" && rule.rule_code.length > 0,
      );
      TestValidator.predicate(
        `rule has rule_name for rule type ${ruleType}`,
        typeof rule.rule_name === "string" && rule.rule_name.length > 0,
      );
      TestValidator.predicate(
        `rule has rule_description for rule type ${ruleType}`,
        typeof rule.rule_description === "string" &&
          rule.rule_description.length > 0,
      );
      TestValidator.predicate(
        `rule has is_active flag for rule type ${ruleType}`,
        typeof rule.is_active === "boolean",
      );
      TestValidator.predicate(
        `rule has execution_order for rule type ${ruleType}`,
        Number.isInteger(rule.execution_order),
      );
      TestValidator.predicate(
        `rule has version for rule type ${ruleType}`,
        typeof rule.version === "string" && rule.version.length > 0,
      );
      TestValidator.predicate(
        `rule has created_at timestamp for rule type ${ruleType}`,
        typeof rule.created_at === "string" && rule.created_at.length > 0,
      );
      TestValidator.predicate(
        `rule has updated_at timestamp for rule type ${ruleType}`,
        typeof rule.updated_at === "string" && rule.updated_at.length > 0,
      );
    }
  }
  // 5. Test search without rule type filter (should return all rules)
  const allRulesBody: IEcommercePlatformEventOfCustomer.IRequest = {
    page: 1,
    limit: 10,
  };
  const allRulesResult =
    await api.functional.ecommerce.superAdministrator.business_rules.index(
      adminConnection,
      { body: allRulesBody },
    );
  typia.assert(allRulesResult);
  TestValidator.equals(
    "pagination limit matches for all rules search",
    allRulesResult.pagination.limit,
    allRulesBody.limit!,
  );
  TestValidator.predicate(
    "pagination records count is valid for all rules search",
    allRulesResult.pagination.records >= allRulesResult.data.length,
  );
  // 6. Test pagination behavior with different parameters
  const paginationTestBody: IEcommercePlatformEventOfCustomer.IRequest = {
    rule_type: "validation",
    page: 2,
    limit: 5,
  };
  const paginationResult =
    await api.functional.ecommerce.superAdministrator.business_rules.index(
      adminConnection,
      { body: paginationTestBody },
    );
  typia.assert(paginationResult);
  TestValidator.equals(
    "second page returns correct limit",
    paginationResult.pagination.limit,
    paginationTestBody.limit!,
  );
  TestValidator.equals(
    "second page shows correct page number",
    paginationResult.pagination.current,
    paginationTestBody.page!,
  );
  TestValidator.predicate(
    "second page has valid data",
    paginationResult.data.length <= paginationTestBody.limit!,
  );
}
