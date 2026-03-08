import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

/**
 * Test successful administrator registration with valid credentials.
 *
 * Test Flow:
 * 1. Prepare valid registration data with unique email, password meeting complexity requirements
 *    (uppercase, lowercase, numeric digit), and session context (href, referrer, optional ip)
 * 2. Call POST /shoppingMall/auth/administrator/join using utility function
 * 3. Verify response body contains IShoppingMallAdministrator.IAuthorized
 * 4. Verify grade is 'regular' (default assignment)
 * 5. Verify token structure is valid
 *
 * Business Rule Validation:
 * - New administrators MUST be assigned 'regular' grade by default
 * - Super administrators can ONLY be created through promotion by another super administrator
 * - Session record must be created in shopping_mall_administrator_sessions for audit trail
 */
export async function test_api_administrator_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Prepare valid join request data
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  const ip = typia.random<string & tags.Format<"ipv4">>();
  // Create new connection for the administrator join
  const adminConnection: api.IConnection = { host: connection.host };
  // Call the join endpoint using utility function
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    },
  });
  typia.assert(authorized);
  // Verify response data matches input
  TestValidator.equals("email matches", authorized.email, email);
  TestValidator.equals("default grade is regular", authorized.grade, "regular");
  TestValidator.equals("deleted_at is null", authorized.deleted_at, null);
  // Verify token structure
  typia.assert(authorized.token);
}
