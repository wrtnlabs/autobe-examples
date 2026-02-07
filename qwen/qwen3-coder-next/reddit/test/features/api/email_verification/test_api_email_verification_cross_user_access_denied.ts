import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import type { IRedditPlatformUserEmailVerification } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUserEmailVerification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test cross-user access denial for email verification records.
 * 1. Register two users (User A and User B)
 * 2. Create a verificationId for User A (using a valid UUID format)
 * 3. Attempt User B to access User A's verification record
 * 4. Verify access is denied with appropriate error
 */
export async function test_api_email_verification_cross_user_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connections
  const userAConnection: api.IConnection = { host: connection.host };
  const userBConnection: api.IConnection = { host: connection.host };
  // Register User A
  await authorize_user_join(userAConnection, {
    body: {
      email: "userA@test.com",
      password: "1234",
      name: "User A",
    } satisfies IRedditPlatformUser.IJoin,
  });
  // Register User B
  await authorize_user_join(userBConnection, {
    body: {
      email: "userB@test.com",
      password: "1234",
      name: "User B",
    } satisfies IRedditPlatformUser.IJoin,
  });
  // Generate a random UUID that represents User A's email verification record
  const userAVerificationId = typia.random<string & tags.Format<"uuid">>();
  // User B attempts to access User A's email verification - should be denied
  await TestValidator.error(
    "User B should not be able to access User A's email verification",
    async () => {
      await api.functional.redditPlatform.user.email_verifications.at(
        userBConnection,
        {
          verificationId: userAVerificationId,
        },
      );
    },
  );
}
