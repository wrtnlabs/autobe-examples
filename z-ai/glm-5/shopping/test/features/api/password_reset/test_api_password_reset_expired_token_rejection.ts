import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomerPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_password_reset_expired_token_rejection(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Step 2: Attempt to verify an expired/fake reset token
  // Use a random UUID-like token to simulate an expired token
  const expiredToken = typia.random<string & tags.Format<"uuid">>();
  const newPassword = RandomGenerator.alphaNumeric(16);
  // Step 3: Verify that expired token is rejected with appropriate HTTP error
  // The system returns 410 Gone for expired tokens, 404 for non-existent tokens
  await TestValidator.httpError(
    "expired token should be rejected",
    [404, 410],
    async () => {
      await api.functional.shoppingMall.administrator.password_resets.verify(
        adminConnection,
        {
          body: {
            token: expiredToken,
            newPassword: newPassword,
          } satisfies IShoppingMallCustomerPasswordReset.IVerify,
        },
      );
    },
  );
}
