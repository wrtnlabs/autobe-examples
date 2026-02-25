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

export async function test_api_business_rule_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join as super administrator (authentication prerequisite)
  await authorize_super_administrator_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceSuperAdministrator.IJoin,
  });
  // Create search criteria that guarantees no results
  const searchCriteria = {
    rule_code: "nonexistent_rule_code_" + RandomGenerator.alphabets(10),
    rule_name: "nonexistent_rule_name_" + RandomGenerator.alphabets(10),
    rule_type: "validation",
    is_active: true,
    page: 1,
    limit: 10,
  } satisfies IEcommercePlatformEventOfCustomer.IRequest;
  // Execute search for business rules
  const result =
    await api.functional.ecommerce.superAdministrator.business_rules.index(
      superAdminConnection,
      { body: searchCriteria },
    );
  typia.assert(result);
  // Validate empty result set with correct pagination
  TestValidator.equals("data array should be empty", result.data.length, 0);
  TestValidator.equals(
    "total records should be 0",
    result.pagination.records,
    0,
  );
  TestValidator.equals("total pages should be 0", result.pagination.pages, 0);
  TestValidator.equals(
    "current page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit should match request",
    result.pagination.limit,
    searchCriteria.limit ?? 100,
  );
  // Validate pagination structure integrity
  TestValidator.predicate(
    "pagination limit should be positive",
    result.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination metadata should be zero for empty results",
    result.pagination.records === 0 && result.pagination.pages === 0,
  );
}
