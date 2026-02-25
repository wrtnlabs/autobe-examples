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

export async function test_api_user_registration_successful_join(
  connection: api.IConnection,
): Promise<void> {
  // Create user-specific connection
  const userConnection: api.IConnection = { host: connection.host };
  // Prepare unique user join data
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    username: RandomGenerator.name(1),
    displayName: RandomGenerator.name(1),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  // 1. Perform user join using the authorization utility function
  const authorizedUser = await authorize_user_join(userConnection, {
    body: joinBody,
  });
  // 2. Assert that the authorizedUser matches the expected type
  typia.assert(authorizedUser);
  // 3. Validate returned data fields
  TestValidator.predicate(
    "user id is UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      authorizedUser.id,
    ),
  );
  TestValidator.equals(
    "email matches input",
    authorizedUser.email,
    joinBody.email,
  );
  TestValidator.equals(
    "username matches input",
    authorizedUser.username,
    joinBody.username,
  );
  TestValidator.equals(
    "display name matches input",
    authorizedUser.display_name,
    joinBody.displayName,
  );
  // bio and avatar_url can be null or some initial value
  TestValidator.predicate(
    "bio is string or null",
    typeof authorizedUser.bio === "string" || authorizedUser.bio === null,
  );
  TestValidator.predicate(
    "avatar_url is string or null",
    typeof authorizedUser.avatar_url === "string" ||
      authorizedUser.avatar_url === null,
  );
  // Karma must be an integer (int32)
  TestValidator.predicate(
    "karma is integer",
    Number.isInteger(authorizedUser.karma),
  );
  // created_at, updated_at must be valid date-time strings
  TestValidator.predicate(
    "created_at is ISO date",
    !Number.isNaN(Date.parse(authorizedUser.created_at)),
  );
  TestValidator.predicate(
    "updated_at is ISO date",
    !Number.isNaN(Date.parse(authorizedUser.updated_at)),
  );
  // deleted_at can be null or valid date-time string
  if (authorizedUser.deleted_at !== null) {
    TestValidator.predicate(
      "deleted_at is ISO date",
      !Number.isNaN(Date.parse(authorizedUser.deleted_at)),
    );
  }
  // Token access and refresh must be non-empty strings
  TestValidator.predicate(
    "access token is string",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "refresh token is string",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );
  // access token expiration dates must be valid ISO strings
  TestValidator.predicate(
    "access token expired_at is ISO date",
    !Number.isNaN(Date.parse(authorizedUser.token.expired_at)),
  );
  TestValidator.predicate(
    "refreshable_until is ISO date",
    !Number.isNaN(Date.parse(authorizedUser.token.refreshable_until)),
  );
  // 4. Validate that password is not returned in the authorizedUser (security check)
  TestValidator.predicate(
    "password not present",
    !("password" in authorizedUser),
  );
  // 5. Attempt to login using the registered credentials
  const loginConnection: api.IConnection = { host: connection.host };
  const loginUser = await authorize_user_login(loginConnection, {
    body: { email: joinBody.email, password: joinBody.password },
  });
  typia.assert(loginUser);
  // 6. Validate login user information matches the joined user
  TestValidator.equals(
    "login id matches join id",
    loginUser.id,
    authorizedUser.id,
  );
  TestValidator.equals(
    "login email matches join email",
    loginUser.email,
    authorizedUser.email,
  );
  TestValidator.equals(
    "login username matches join username",
    loginUser.username,
    authorizedUser.username,
  );
  TestValidator.equals(
    "login display_name matches join display_name",
    loginUser.display_name,
    authorizedUser.display_name,
  );
}
