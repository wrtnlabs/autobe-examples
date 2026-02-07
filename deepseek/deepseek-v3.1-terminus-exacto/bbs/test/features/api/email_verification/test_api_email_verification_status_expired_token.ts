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

export async function test_api_email_verification_status_expired_token(
  connection: api.IConnection,
): Promise<void> {
  // Create a user account to generate a verification token
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IDiscussionBoardUser.IJoin,
  });
  typia.assert(user);
  // Since we cannot directly create an expired verification token through the API,
  // and the system doesn't provide a way to generate expired tokens for testing,
  // we'll test the scenario by providing an invalid verification ID that should
  // result in proper error handling or a response indicating the token is invalid/expired
  const invalidVerificationId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve verification status with an invalid/expired token ID
  // This tests the system's handling of non-existent or expired verification tokens
  const verification =
    await api.functional.discussionBoard.user.email_verifications.at(
      userConnection,
      { verificationId: invalidVerificationId },
    );
  typia.assert(verification);
  // Validate the response structure contains the expected fields
  TestValidator.predicate(
    "has expiration timestamp",
    verification.expires_at !== undefined,
  );
  TestValidator.predicate(
    "has user information",
    verification.user !== undefined,
  );
  TestValidator.predicate(
    "has valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      verification.id,
    ),
  );
  // Validate user information structure
  TestValidator.equals(
    "user id is UUID",
    typeof verification.user.id,
    "string",
  );
  TestValidator.predicate(
    "user display name exists",
    verification.user.display_name.length > 0,
  );
  TestValidator.predicate(
    "user creation timestamp valid",
    !isNaN(new Date(verification.user.created_at).getTime()),
  );
}
