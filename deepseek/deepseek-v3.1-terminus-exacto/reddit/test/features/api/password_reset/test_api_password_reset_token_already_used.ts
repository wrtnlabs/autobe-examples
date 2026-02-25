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

export async function test_api_password_reset_token_already_used(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  // Register user using authorize_user_join utility function
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(user);
  // Create a password reset token ID
  const resetId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve the password reset token
  const resetToken =
    await api.functional.communityPlatform.user.password_resets.at(
      { host: connection.host },
      { resetId },
    );
  typia.assert(resetToken);
  // Validate that the token has a used_at timestamp indicating it's already consumed
  TestValidator.notEquals(
    "used_at should not be null",
    resetToken.used_at,
    null,
  );
  // Validate other token properties are present
  TestValidator.equals("token should have valid id", resetToken.id, resetId);
  TestValidator.notEquals("token should not be empty", resetToken.token, "");
  // Validate user summary is present
  typia.assert(resetToken.user);
  TestValidator.equals("user id should be valid", resetToken.user.id, user.id);
  TestValidator.equals(
    "user username should match",
    resetToken.user.username,
    user.username,
  );
}
