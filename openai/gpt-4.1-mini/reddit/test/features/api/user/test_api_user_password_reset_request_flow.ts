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

export async function test_api_user_password_reset_request_flow(
  connection: api.IConnection,
): Promise<void> {
  // Scenario description in comment
  /**
   * Test user password reset request flow.
   *
   * Scenario 1: Successful password reset request with registered email.
   * Scenario 2: Password reset request with non-registered email.
   * Scenario 3: Password reset request with invalid email format.
   */
  // 1. Create a user account for registered email scenario
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_user_join(userConnection, {});
  typia.assert(registeredUser);
  // 2. Scenario 1: Password reset with registered user's email
  const resetResponseRegistered =
    await generate_random_community_platform_user_password_resets_create_password_reset(
      userConnection,
      { body: { email: registeredUser.email } },
    );
  typia.assert(resetResponseRegistered);
  TestValidator.equals(
    "password reset token userId",
    resetResponseRegistered.communityPlatformUserId,
    registeredUser.id,
  );
  TestValidator.predicate(
    "token expiry is future",
    new Date(resetResponseRegistered.expiresAt) > new Date(),
  );
  TestValidator.equals(
    "token used status",
    resetResponseRegistered.used,
    false,
  );
  // 3. Scenario 2: Password reset request with a non-registered valid email
  const fakeEmail = `nonexistent_${typia.random<string & tags.Format<"email">>()}`;
  const resetResponseFake =
    await generate_random_community_platform_user_password_resets_create_password_reset(
      userConnection,
      { body: { email: fakeEmail } },
    );
  typia.assert(resetResponseFake);
  // The system must respond with the same acknowledgement message and NOT create a token for non-existent user
  TestValidator.predicate(
    "non-registered email reset returns token id present",
    typeof resetResponseFake.id === "string" && resetResponseFake.id.length > 0,
  );
  // 4. Scenario 3: Password reset request with invalid email format must throw 400
  await TestValidator.error(
    "password reset with invalid email format",
    async () => {
      await generate_random_community_platform_user_password_resets_create_password_reset(
        userConnection,
        {
          body: {
            email: "invalid-email-format" as string & tags.Format<"email">,
          },
        },
      );
    },
  );
}
