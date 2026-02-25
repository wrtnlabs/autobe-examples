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

/**
 * Test successful retrieval of email verification record by authorized user.
 * 1. Authenticate as regular user using join operation
 * 2. Call GET endpoint with valid verification UUID
 * 3. Verify response contains complete verification details including token, expiration timestamp, verification status, and associated user summary
 * 4. Validate all timestamp fields are properly formatted
 * 5. Confirm user association includes display name and bio
 */
export async function test_api_user_email_verification_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create user connection and authenticate via join
  const userConnection: api.IConnection = { host: connection.host };
  const authorizedUser = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(authorizedUser);
  // 2. Generate a random verification UUID and call the endpoint
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  const emailVerification =
    await api.functional.discussionBoard.user.users.email_verifications.at(
      userConnection,
      { verificationId },
    );
  typia.assert(emailVerification);
  // 3. Validate complete verification details
  TestValidator.equals(
    "verification ID matches",
    emailVerification.id,
    verificationId,
  );
  TestValidator.predicate(
    "token is present",
    emailVerification.token.length > 0,
  );
  // 4. Timestamp validation is handled by typia.assert above
  // All date-time fields are already validated by typia's format checking
  // 5. Confirm user association includes required fields
  TestValidator.predicate(
    "user display_name is present",
    emailVerification.user.display_name.length > 0,
  );
  // bio is optional (can be null or undefined)
  if (
    emailVerification.user.bio !== null &&
    emailVerification.user.bio !== undefined
  ) {
    TestValidator.predicate(
      "user bio is non-empty when present",
      emailVerification.user.bio.length > 0,
    );
  }
}
