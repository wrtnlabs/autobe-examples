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
import { generate_random_community_platform_user_password_resets_create_password_reset } from "../../../generate/generate_random_community_platform_user_password_resets_create_password_reset";
import { prepare_random_community_platform_user_password_reset } from "../../../prepare/prepare_random_community_platform_user_password_reset";

export async function test_api_user_password_reset_update_various_cases(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario 1: Successful Update of Password Reset Token
   */
  const userConnection: api.IConnection = { host: connection.host };
  // Join and authenticate user
  const authorized = await authorize_user_join(userConnection, {});
  // Update token in userConnection.headers
  userConnection.headers = { Authorization: authorized.token.access };
  // Create password reset record
  const passwordReset =
    await generate_random_community_platform_user_password_resets_create_password_reset(
      userConnection,
      { body: { email: authorized.email } },
    );
  // Prepare update payload with new token and future expiration
  const newToken = RandomGenerator.alphaNumeric(32);
  const futureDate = new Date(Date.now() + 3600 * 1000).toISOString(); // 1 hour ahead
  const updateBody: ICommunityPlatformUserPasswordReset.IUpdate = {
    token: newToken,
    expiresAt: futureDate,
    used: false,
    communityPlatformUserId: authorized.id,
  };
  // Perform update
  const updatedReset =
    await api.functional.communityPlatform.user.password_resets.updatePasswordReset(
      userConnection,
      {
        id: passwordReset.id,
        body: updateBody,
      },
    );
  typia.assert(updatedReset);
  // Validations
  TestValidator.equals("token updated", updatedReset.token, updateBody.token);
  TestValidator.equals(
    "expiresAt updated",
    updatedReset.expiresAt,
    updateBody.expiresAt,
  );
  TestValidator.equals("used flag updated", updatedReset.used, updateBody.used);
  TestValidator.equals(
    "communityPlatformUserId matches",
    updatedReset.communityPlatformUserId,
    authorized.id,
  );
  /**
   * Scenario 2: Unauthorized Access Attempt
   */
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError("unauthorized update", 401, async () => {
    await api.functional.communityPlatform.user.password_resets.updatePasswordReset(
      unauthorizedConnection,
      {
        id: passwordReset.id,
        body: updateBody,
      },
    );
  });
  /**
   * Scenario 3: Update With Expired Token
   */
  // Authenticate user again for clear session
  const userConnection2: api.IConnection = { host: connection.host };
  const authorized2 = await authorize_user_join(userConnection2, {});
  userConnection2.headers = { Authorization: authorized2.token.access };
  // Create new password reset record
  const passwordReset2 =
    await generate_random_community_platform_user_password_resets_create_password_reset(
      userConnection2,
      { body: { email: authorized2.email } },
    );
  // Prepare update payload with past expiration date
  const pastDate = new Date(Date.now() - 3600 * 1000).toISOString(); // 1 hour ago
  const expiredUpdateBody: ICommunityPlatformUserPasswordReset.IUpdate = {
    token: RandomGenerator.alphaNumeric(32),
    expiresAt: pastDate,
    used: false,
    communityPlatformUserId: authorized2.id,
  };
  // Perform update
  const updatedExpiredReset =
    await api.functional.communityPlatform.user.password_resets.updatePasswordReset(
      userConnection2,
      {
        id: passwordReset2.id,
        body: expiredUpdateBody,
      },
    );
  typia.assert(updatedExpiredReset);
  // Validate updated fields reflect expired token
  TestValidator.equals(
    "expired token updated",
    updatedExpiredReset.token,
    expiredUpdateBody.token,
  );
  TestValidator.equals(
    "expiresAt set to past",
    updatedExpiredReset.expiresAt,
    expiredUpdateBody.expiresAt,
  );
  TestValidator.equals(
    "used flag unchanged",
    updatedExpiredReset.used,
    expiredUpdateBody.used,
  );
  TestValidator.equals(
    "communityPlatformUserId matches expired",
    updatedExpiredReset.communityPlatformUserId,
    authorized2.id,
  );
}
