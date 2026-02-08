import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { ICommunityPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving detailed information of a specific email verification token by a registered user. The user must have joined the platform (registration). Verify the response includes all expected fields such as token, is_verified, expires_at, created_at, updated_at, and deleted_at. Check correct handling of path parameter as UUID. Confirm that only authorized users can access their own tokens but not others'.
  // 1. User registration to get user authorization token and context
  const userJoinConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(userJoinConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Add the Authorization header with JWT access token
  userJoinConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // 2. Try retrieving the email verification token with a random UUID (simulate retrieval)
  const validEmailVerificationId = typia.random<string & tags.Format<"uuid">>();
  const emailVerification =
    await api.functional.communityPlatform.user.email_verifications.at(
      userJoinConnection,
      {
        emailVerificationId: validEmailVerificationId,
      },
    );
  // typia.assert will validate the entire response
  typia.assert(emailVerification);
  // 3. Test that user cannot access another user's token (using another random UUID)
  const otherUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "access another user's token is unauthorized",
    async () => {
      await api.functional.communityPlatform.user.email_verifications.at(
        userJoinConnection,
        {
          emailVerificationId: otherUUID,
        },
      );
    },
  );
}
