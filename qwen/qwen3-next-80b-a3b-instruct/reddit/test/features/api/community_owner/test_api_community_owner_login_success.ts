import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_owner_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new community owner account via join
  const joinConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const joined = await authorize_community_owner_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password,
      displayName: RandomGenerator.name(),
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  typia.assert(joined);
  // 2. Login with the same email and password
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedin = await authorize_community_owner_login(loginConnection, {
    body: {
      email: joined.email,
      password,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  typia.assert(loggedin);
  // 3. Validate the returned IAuthorized structure
  TestValidator.equals("id matches", loggedin.id, joined.id);
  TestValidator.equals("email matches", loggedin.email, joined.email);
  TestValidator.equals(
    "displayName matches",
    loggedin.display_name,
    joined.display_name,
  );
  TestValidator.predicate(
    "username is non-empty",
    loggedin.username.length > 0,
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(loggedin.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(loggedin.updated_at),
  );
  TestValidator.equals("is_deleted is false", loggedin.is_deleted, false);
  TestValidator.predicate(
    "karma_score is int32",
    Number.isInteger(loggedin.karma_score),
  );
  // 4. Validate the IAuthorizationToken structure
  TestValidator.equals(
    "access token exists",
    loggedin.token.access.length > 10,
    true,
  );
  TestValidator.equals(
    "refresh token exists",
    loggedin.token.refresh.length > 10,
    true,
  );
  TestValidator.predicate(
    "expired_at is valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loggedin.token.expired_at,
    ),
  );
  TestValidator.predicate(
    "refreshable_until is valid",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      loggedin.token.refreshable_until,
    ),
  );
  TestValidator.predicate(
    "expired_at is after now",
    new Date(loggedin.token.expired_at) > new Date(),
  );
  TestValidator.predicate(
    "refreshable_until is after expired_at",
    new Date(loggedin.token.refreshable_until) >
      new Date(loggedin.token.expired_at),
  );
}
