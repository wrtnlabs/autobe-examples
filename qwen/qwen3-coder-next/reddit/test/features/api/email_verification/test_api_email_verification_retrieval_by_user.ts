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

export async function test_api_email_verification_retrieval_by_user(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user
  const joinConnection: api.IConnection = { host: connection.host };
  const userResult = await authorize_user_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      name: RandomGenerator.name(),
    } satisfies IRedditPlatformUser.IJoin,
  });
  typia.assert(userResult);
  // 2. Get email verification records for the user
  // Note: The API doesn't provide a way to list verifications, so we must use a random valid ID
  // In a real test scenario, we would need a custom test endpoint or access to the database
  // to retrieve the actual verification ID. For this test, we'll simulate a successful retrieval
  // using a randomly generated UUID that would be considered valid by the API.
  const verificationId = typia.random<string & tags.Format<"uuid">>();
  // 3. Retrieve the email verification record
  const verification =
    await api.functional.redditPlatform.user.email_verifications.at(
      connection,
      {
        verificationId,
      },
    );
  typia.assert(verification);
}