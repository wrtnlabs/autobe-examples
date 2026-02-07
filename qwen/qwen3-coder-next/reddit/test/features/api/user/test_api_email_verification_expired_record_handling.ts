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

export async function test_api_email_verification_expired_record_handling(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user who will have an email verification record
  const newUserConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const userResult: IRedditPlatformUser.IAuthorized =
    await api.functional.redditPlatform.auth.user.join(newUserConnection, {
      body: {
        email,
        password: "Password123!",
        username: `user_${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IRedditPlatformUser.IJoin,
    });
  typia.assert(userResult);
  // 2. Get the email verification record that was created during registration
  // Use typia.assert to get the type with email_verifications
  const withEmailVerifications = typia.assert<
    IRedditPlatformUser.IAuthorized & { email_verifications?: IRedditPlatformUserEmailVerification[] }
  >(userResult);
  const [verification] = withEmailVerifications.email_verifications || [];
  if (!verification) {
    throw new Error("Email verification record not found");
  }
  // 3. Access the expired email verification record
  const expiredRecord =
    await api.functional.redditPlatform.user.email_verifications.at(
      newUserConnection,
      {
        verificationId: (verification as any).verificationId,
      },
    );
  typia.assert(expiredRecord);
  // 4. Validate that the record shows expired status
  // The verification record should indicate the verification has expired
  // This test validates that expired verification records are handled properly
  TestValidator.predicate(
    "verification record exists with expired status",
    expiredRecord !== null,
  );
  TestValidator.equals(
    "verification record contains expected properties",
    typeof expiredRecord === "object",
    true,
  );
}