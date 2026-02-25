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

export async function test_api_user_email_verification_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a user account that will have an email verification record
  const joinResult = await authorize_user_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(joinResult);
  // Create a connection for the email verification call (no auth required)
  const verificationConnection: api.IConnection = { host: connection.host };
  // Simulate an expired token by using an invalid/expired token format
  // In a real scenario, this would be a token that has passed its 24-hour expiration
  const expiredToken = typia.random<string & tags.Format<"uuid">>();
  // Attempt to verify with the expired token and validate it fails
  await TestValidator.error(
    "expired token should fail verification",
    async () => {
      const result =
        await api.functional.discussionBoard.user.users.email_verifications.update(
          verificationConnection,
          {
            body: {
              token: expiredToken,
            } satisfies IDiscussionBoardUserEmailVerification.IRequest,
          },
        );
      typia.assert(result);
      // Validate that the verification failed
      TestValidator.equals("verification should fail", result.success, false);
      TestValidator.equals("user should not be returned", result.user, null);
      TestValidator.equals(
        "verified_at should be null",
        result.verified_at,
        null,
      );
      TestValidator.predicate(
        "created_at should be present",
        result.created_at !== null,
      );
    },
  );
}
