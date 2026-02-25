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

export async function test_api_business_rule_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "test1234",
    } satisfies IEcommerceAdministrator.IJoin,
  });
  // Test 1: Search for non-existent rule_code
  const emptyRuleCode =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          rule_code: "NON_EXISTENT_RULE_CODE_12345",
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(emptyRuleCode);
  TestValidator.equals(
    "empty result for non-existent rule_code",
    emptyRuleCode.data.length,
    0,
  );
  TestValidator.predicate(
    "valid pagination structure for empty rule_code search",
    emptyRuleCode.pagination.records === 0 &&
      emptyRuleCode.pagination.pages === 0,
  );
  // Test 2: Filter for inactive rules only (may produce empty results)
  const inactiveRules =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          is_active: false,
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(inactiveRules);
  TestValidator.predicate(
    "valid response for inactive rules filter",
    inactiveRules.pagination.current >= 1,
  );
  // Test 3: Search for non-existent rule type
  const invalidRuleType =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          rule_type: "NON_EXISTENT_RULE_TYPE_XYZ",
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(invalidRuleType);
  TestValidator.equals(
    "empty result for non-existent rule_type",
    invalidRuleType.data.length,
    0,
  );
  // Test 4: Case-insensitive text search with non-matching term
  const nonMatchingSearch =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          search: "xyz123abc789def456ghi",
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(nonMatchingSearch);
  TestValidator.equals(
    "empty result for non-matching text search",
    nonMatchingSearch.data.length,
    0,
  );
  // Test 5: Combined restrictive filters
  const combinedEmptyFilters =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          rule_code: "NON_EXISTENT_CODE",
          rule_type: "INVALID_TYPE",
          is_active: true,
          search: "NO_MATCH_TERM",
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(combinedEmptyFilters);
  TestValidator.equals(
    "empty result for combined restrictive filters",
    combinedEmptyFilters.data.length,
    0,
  );
  TestValidator.predicate(
    "valid pagination for combined empty search",
    combinedEmptyFilters.pagination.records === 0 &&
      combinedEmptyFilters.pagination.pages === 0,
  );
  // Test 6: Edge case - extreme search term
  const extremeSearch =
    await api.functional.ecommerce.administrator.business_rules.index(
      adminConnection,
      {
        body: {
          search:
            "@@@@@@@####$$$$$%%%%%%%^^^^^^^^&&&&&&&&&********(((((())))))",
        } satisfies IEcommercePlatformEventOfCustomer.IRequest,
      },
    );
  typia.assert(extremeSearch);
  TestValidator.predicate(
    "successful response for extreme search term",
    extremeSearch.pagination.current >= 1,
  );
}
