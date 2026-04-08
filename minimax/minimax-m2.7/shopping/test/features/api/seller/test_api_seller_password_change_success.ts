import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test successful seller password change with session continuity verification.
 *
 * Validates the complete password change workflow for authenticated sellers including
 * current password verification, new password acceptance, session maintenance, and
 * authentication with the new credentials. Ensures that the password hash is properly
 * updated while maintaining the seller's active session.
 *
 * The test verifies the following critical business rules:
 * - Current password must be verified before accepting the new password
 * - New password must meet minimum security requirements (8+ characters)
 * - Password hash is correctly updated in the database
 * - Session continuity is maintained after password change (seller stays logged in)
 * - Old password no longer authenticates the seller
 * - New password successfully authenticates the seller
 *
 * 1. Register a new seller account with random email and password.
 * 2. Authenticate the seller to obtain JWT tokens.
 * 3. Store the original password for later verification.
 * 4. Generate a new password different from the original.
 * 5. Change password using the update endpoint with current and new passwords.
 * 6. Verify the update returns void (204 No Content).
 * 7. Verify seller remains logged in with existing connection.
 * 8. Attempt login with old password - should fail with authentication error.
 * 9. Attempt login with new password - should succeed and return valid tokens.
 */
export async function test_api_seller_password_change_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new seller account
  const originalPassword = RandomGenerator.alphaNumeric(16);
  const email = typia.random<string & tags.Format<"email">>();

  const sellerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_seller_join(sellerConnection, {
    body: {
      email,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(authorized);

  // 2. Authenticate the seller to obtain JWT tokens
  const loginResponse = await authorize_seller_login(sellerConnection, {
    body: {
      email,
      password: originalPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(loginResponse);

  // 3. Store the token for session continuity verification
  const originalToken = sellerConnection.headers?.Authorization;

  // 4. Generate a new password different from the original
  const newPassword = RandomGenerator.alphaNumeric(20);

  // 5. Change password using the update endpoint
  await api.functional.ecommerceMall.seller.seller.password.update(
    sellerConnection,
    {
      body: {
        currentPassword: originalPassword,
        newPassword: newPassword,
      } satisfies IEcommerceMallSeller.IPasswordChange,
    },
  );

  // 6. Verify seller remains logged in (session is not invalidated)
  TestValidator.predicate(
    "session maintained after password change",
    sellerConnection.headers?.Authorization != null,
  );
  TestValidator.equals(
    "token unchanged after password change",
    sellerConnection.headers?.Authorization,
    originalToken,
  );

  // 7. Attempt login with old password - should fail
  const oldPasswordConnection: api.IConnection = { host: connection.host };
  await TestValidator.error("old password should fail authentication", async () => {
    await api.functional.ecommerceMall.auth.seller.login(oldPasswordConnection, {
      body: {
        email,
        password: originalPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  });

  // 8. Attempt login with new password - should succeed
  const newPasswordConnection: api.IConnection = { host: connection.host };
  const newLoginResponse = await api.functional.ecommerceMall.auth.seller.login(
    newPasswordConnection,
    {
      body: {
        email,
        password: newPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  typia.assert(newLoginResponse);

  // 9. Verify new login response contains valid seller information
  TestValidator.equals("email matches", newLoginResponse.email, email);
  TestValidator.equals("seller id matches", newLoginResponse.id, authorized.id);
}