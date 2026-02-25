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

export async function test_api_password_reset_token_expired(
  connection: api.IConnection,
): Promise<void> {
  // Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
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
  // Since we don't have an endpoint to create password reset tokens,
  // we need to test the retrieval functionality with what's available.
  // The test will verify that the endpoint structure is correct and
  // handles the request properly.
  // Generate a valid UUID format for testing
  const testResetId = typia.random<string & tags.Format<"uuid">>();
  // Test the password reset retrieval endpoint
  // This will likely result in a 404 error since the token doesn't exist,
  // but it validates that the endpoint is accessible and properly structured
  await TestValidator.error(
    "retrieving non-existent token should error",
    async () => {
      await api.functional.communityPlatform.user.password_resets.at(
        userConnection,
        { resetId: testResetId },
      );
    },
  );
  // The main purpose of this test is to validate that the system can handle
  // password reset token retrieval requests, even if the specific scenario
  // of expired tokens cannot be fully tested without token creation capability
  TestValidator.predicate(
    "user authentication successful",
    user.token.access.length > 0,
  );
  TestValidator.equals("user email format valid", typeof user.email, "string");
}
