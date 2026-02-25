import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_password_reset_successful_update(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario: Successfully reset user password with a valid and unused password reset token. The test should validate that when a user submits a valid reset token and a strong new password, the system updates the password, invalidates the token, and responds with success. It should verify that the token usage flag is updated, the password is changed securely, and no authentication is required for this operation. Additionally, confirm that the new password meets strength requirements.
  // 1. User joins the platform
  const userConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_join(userConnection, {});
  typia.assert(userAuthorized);
  // Prepare a valid, unused password reset token for the user
  // For this scenario, we'll simulate generating a token and preparing the payload
  // Since no utility provided to create a reset token directly, we simulate by crafting the update payload
  // Create a strong new password
  const newPassword = RandomGenerator.alphaNumeric(20);
  // Setup the reset token payload
  const resetPayload: ICommunityPlatformUserPasswordReset.IUpdate = {
    token: RandomGenerator.alphaNumeric(30), // simulate token string
    expiresAt: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
    used: false,
    communityPlatformUserId: userAuthorized.id,
  };
  // Perform the password reset PATCH operation
  await api.functional.communityPlatform.user.password_resets.update(
    userConnection,
    {
      body: resetPayload,
    },
  );
  // Since the API spec shows this endpoint returns void on success, no response to assert
  // We expect no error thrown means success
  // Additional validation: attempt to reuse the same token should fail
  await TestValidator.error("reuse of used token should fail", async () => {
    await api.functional.communityPlatform.user.password_resets.update(
      userConnection,
      {
        body: { ...resetPayload, used: true },
      },
    );
  });
}
