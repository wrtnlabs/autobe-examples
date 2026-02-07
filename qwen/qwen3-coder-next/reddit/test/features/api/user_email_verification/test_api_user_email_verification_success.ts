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

export async function test_api_user_email_verification_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new user account to generate email verification record
  const adminConnection: api.IConnection = { host: connection.host };
  const userConnection: api.IConnection = { host: connection.host };
  // Register new user (creates email verification record)
  const userCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "1234",
    name: RandomGenerator.name(),
  } satisfies IRedditPlatformUser.IJoin;
  // Use the join function to create user and get authentication
  const authorized = await authorize_user_join(adminConnection, {
    body: userCreds,
  });
  typia.assert(authorized);
  // 2. Perform email verification
  const verification =
    await api.functional.redditPlatform.user.email_verifications.update(
      userConnection,
    );
  typia.assert(verification);
  // 3. Validate the verification response
  // The response should confirm email verification was successful
  TestValidator.predicate(
    "verification successful",
    verification !== null && verification !== undefined,
  );
}
