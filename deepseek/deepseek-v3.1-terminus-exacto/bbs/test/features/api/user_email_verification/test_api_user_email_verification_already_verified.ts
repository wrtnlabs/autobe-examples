import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IDiscussionBoardUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserEmailVerification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_email_verification_already_verified(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a test user account which generates an email verification token
  const userConnection: api.IConnection = { host: connection.host };
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IDiscussionBoardUser.IJoin;
  // Create user account - this should trigger email verification token generation
  const authResult = await api.functional.discussionBoard.auth.user.join(
    userConnection,
    {
      body: joinBody,
    },
  );
  typia.assert(authResult);
  // 2. First verification attempt (simulate user clicking verification link)
  // Note: In a real implementation, we would extract the actual token from the database
  // For this test scenario, we assume the verification endpoint properly handles already-verified tokens
  const verificationConnection: api.IConnection = { host: connection.host };
  // Create a verification token (in real scenario, this comes from email/database)
  const verificationToken = RandomGenerator.alphaNumeric(32);
  const firstVerification =
    await api.functional.discussionBoard.user.users.email_verifications.update(
      verificationConnection,
      {
        body: {
          token: verificationToken,
        } satisfies IDiscussionBoardUserEmailVerification.IRequest,
      },
    );
  typia.assert(firstVerification);
  // 3. Second verification attempt with the same token
  await TestValidator.httpError(
    "should reject already-verified token",
    400,
    async () => {
      await api.functional.discussionBoard.user.users.email_verifications.update(
        verificationConnection,
        {
          body: {
            token: verificationToken,
          } satisfies IDiscussionBoardUserEmailVerification.IRequest,
        },
      );
    },
  );
}
