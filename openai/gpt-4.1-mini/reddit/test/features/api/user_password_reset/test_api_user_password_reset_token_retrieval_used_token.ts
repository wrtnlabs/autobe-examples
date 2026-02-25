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

export async function test_api_user_password_reset_token_retrieval_used_token(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Attempt to retrieve a used password reset token; ensure system behavior prevents reuse and validates authorization.
  // 1. User registration to obtain authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const registeredUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Password123!",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  typia.assert(registeredUser);
  // Update userConnection with authorization header
  userConnection.headers ??= {};
  userConnection.headers.Authorization = registeredUser.token.access;
  // 2. Create a password reset token for the user
  const passwordReset =
    await generate_random_community_platform_user_password_resets_create_password_reset(
      userConnection,
      {
        body: { email: registeredUser.email },
      },
    );
  typia.assert(passwordReset);
  // 3. Retrieve the password reset token (initial fetch)
  const retrievedToken =
    await api.functional.communityPlatform.user.password_resets.at(
      userConnection,
      {
        id: passwordReset.id,
      },
    );
  typia.assert(retrievedToken);
  // Validate that the token is not used initially
  TestValidator.equals(
    "Token 'used' flag initially",
    retrievedToken.used,
    false,
  );
  // 4. Re-retrieve the same token to test consistent behavior
  const retrievedTokenAgain =
    await api.functional.communityPlatform.user.password_resets.at(
      userConnection,
      {
        id: passwordReset.id,
      },
    );
  typia.assert(retrievedTokenAgain);
  TestValidator.equals(
    "Re-retrieved token matches",
    retrievedToken.id,
    retrievedTokenAgain.id,
  );
  TestValidator.equals(
    "Re-retrieved token usage flag matches",
    retrievedToken.used,
    retrievedTokenAgain.used,
  );
  // 5. Negative case: Attempt to retrieve a non-existent token id
  await TestValidator.error(
    "Fetch non-existent token throws error",
    async () => {
      await api.functional.communityPlatform.user.password_resets.at(
        userConnection,
        {
          id: typia.random<string & tags.Format<"uuid">>(), // Random UUID unlikely to exist
        },
      );
    },
  );
}
