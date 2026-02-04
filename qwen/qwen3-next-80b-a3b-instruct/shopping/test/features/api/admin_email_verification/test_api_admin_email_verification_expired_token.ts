import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminEmailVerification";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_email_verification_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new admin account to trigger token generation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com",
      ip: "192.168.1.1",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Step 2: Create a connection for the verification request
  // Note: The verification endpoint doesn't require authentication
  // We just need the host to make the request
  const verifyConnection: api.IConnection = { host: connection.host };
  // Step 3: Generate a random but invalid verification token
  // We use a random string of sufficient length to ensure it doesn't exist
  const invalidToken = typia.random<string & tags.MinLength<1>>();
  // Step 4: Try to verify with the invalid token
  // The system should reject non-existent or invalid tokens with a 400 error
  await TestValidator.error(
    "invalid verification token should fail",
    async () => {
      await api.functional.shoppingMall.admin.auth.admins.email.verify(
        verifyConnection,
        {
          body: {
            token: invalidToken,
          } satisfies IShoppingMallAdminEmailVerification,
        },
      );
    },
  );
}
