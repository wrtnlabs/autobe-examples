import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_login_with_unverified_email(
  connection: api.IConnection,
): Promise<void> {
  // Create a user account with unverified email
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_user_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(joinResponse);
  // Verify email_verified is false in join response
  TestValidator.equals(
    "email_verified should be false after join",
    joinResponse.email_verified,
    false,
  );
  // Attempt login with the same credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_user_login(loginConnection, {
    body: {
      email: joinResponse.email,
      password: "password123",
    } satisfies ICommunityPlatformUser.ILogin,
  });
  typia.assert(loginResponse);
  // Verify login returns user information with email_verified: false
  TestValidator.equals(
    "email_verified should remain false after login",
    loginResponse.email_verified,
    false,
  );
  TestValidator.equals(
    "email should match",
    loginResponse.email,
    joinResponse.email,
  );
  TestValidator.equals(
    "username should match",
    loginResponse.username,
    joinResponse.username,
  );
  TestValidator.equals(
    "user ID should match",
    loginResponse.id,
    joinResponse.id,
  );
  // Validate that login was successful despite unverified email
  TestValidator.predicate(
    "login should succeed with unverified email",
    loginResponse.id === joinResponse.id,
  );
}
