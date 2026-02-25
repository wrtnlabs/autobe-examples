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

export async function test_api_business_rule_search_combined_filters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate super administrator and create fresh authenticated connection
  const joinConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_administrator_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  typia.assert(authResult);
  // Create fresh authenticated connection for API calls
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `${authResult.token.access}` },
  };
  // 2. Test combination 1: rule_code exact match + rule_name partial match
  const testRuleCode1 = RandomGenerator.alphaNumeric(8);
  const testRuleName1 = "product_validation_rule_";
  const searchResults1 =
    await api.functional.ecommerce.superAdministrator.business_rules.index(
      authenticatedConnection,
      {
        body: {
          rule_code: testRuleCode1,
          rule_name: testRuleName1,
          page: 1,
          limit: 10,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(searchResults1);
  // Validate all returned rules match the filter criteria
  for (const rule of searchResults1.data) {
    TestValidator.equals(
      "rule_code exact match",
      rule.rule_code,
      testRuleCode1,
    );
    TestValidator.predicate(
      "rule_name contains search term",
      rule.rule_name.toLowerCase().includes(testRuleName1.toLowerCase()),
    );
  }
  // 3. Test combination 2: rule_type + is_active filtering
  const testRuleType = "validation";
  const activeStatus = true;
  const searchResults2 =
    await api.functional.ecommerce.superAdministrator.business_rules.index(
      authenticatedConnection,
      {
        body: {
          rule_type: testRuleType,
          is_active: activeStatus,
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(searchResults2);
  for (const rule of searchResults2.data) {
    TestValidator.equals("rule_type exact match", rule.rule_type, testRuleType);
    TestValidator.equals(
      "is_active status match",
      rule.is_active,
      activeStatus,
    );
  }
  // 4. Test combination 3: multiple filters + text search
  const searchTerm = RandomGenerator.alphabets(5);
  const searchResults3 =
    await api.functional.ecommerce.superAdministrator.business_rules.index(
      authenticatedConnection,
      {
        body: {
          search: searchTerm,
          rule_type: "workflow",
          is_active: false,
          page: 2,
          limit: 3,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(searchResults3);
  if (searchResults3.data.length > 0) {
    const firstRule = searchResults3.data[0];
    TestValidator.predicate(
      "search term in description",
      firstRule.rule_description
        .toLowerCase()
        .includes(searchTerm.toLowerCase()),
    );
    TestValidator.equals(
      "rule_type matches filter",
      firstRule.rule_type,
      "workflow",
    );
    TestValidator.equals(
      "is_active matches filter",
      firstRule.is_active,
      false,
    );
  }
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "page number valid",
    searchResults3.pagination.current >= 1,
  );
  TestValidator.predicate(
    "limit valid",
    searchResults3.pagination.limit >= 1 &&
      searchResults3.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "records count valid",
    searchResults3.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count valid",
    searchResults3.pagination.pages >= 0,
  );
  // 6. Test edge case: empty result scenario
  const searchResults4 =
    await api.functional.ecommerce.superAdministrator.business_rules.index(
      authenticatedConnection,
      {
        body: {
          rule_code: "non_existent_rule_" + RandomGenerator.alphaNumeric(10),
          rule_name: "impossible_name_" + RandomGenerator.alphaNumeric(20),
          rule_type: "invalid_type",
          is_active: true,
          page: 1,
          limit: 5,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(searchResults4);
  TestValidator.predicate(
    "empty results for impossible criteria",
    searchResults4.data.length === 0,
  );
}
