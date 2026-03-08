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
 * Test administrator login rejection when email does not exist in the system.
 *
 * This test verifies that attempting to login with an unregistered email
 * address properly returns a 401 Unauthorized error. The system should
 * not reveal whether the email exists or not to prevent account enumeration.
 *
 * Security considerations:
 * - Error message should be identical to incorrect password case
 * - Response time should be similar to valid email case to prevent timing attacks
 * - No tokens should be returned in response
 */
export async function test_api_administrator_login_nonexistent_email(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random email that definitely doesn't exist in the system
  const nonexistentEmail = typia.random<string & tags.Format<"email">>();
  // Prepare login request with valid format but nonexistent email
  const loginBody = {
    email: nonexistentEmail,
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallAdministrator.ILogin;
  // Attempt login with nonexistent email - should return 401 Unauthorized
  await TestValidator.httpError(
    "should return 401 for nonexistent email",
    401,
    async () => {
      await api.functional.shoppingMall.auth.administrator.login(connection, {
        body: loginBody,
      });
    },
  );
}
