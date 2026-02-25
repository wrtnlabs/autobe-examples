import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardArticleTag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticleTag";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardRegisteredUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardRegisteredUser";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_registered_user_join } from "../../../authorize/authorize_registered_user_join";
import { authorize_registered_user_login } from "../../../authorize/authorize_registered_user_login";
import { authorize_registered_user_refresh } from "../../../authorize/authorize_registered_user_refresh";

export async function test_api_registered_user_login_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Register a new user using join utility function
  const joinConnection: api.IConnection = { host: connection.host };
  const joinedUser = await authorize_registered_user_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "StrongPassword123!",
    } satisfies IDiscussionBoardRegisteredUser.IJoin,
  });
  typia.assert(joinedUser);
  // 2. Login: Attempt login using the registered email and password
  const loginConnection: api.IConnection = { host: connection.host };
  const loggedInUser = await authorize_registered_user_login(loginConnection, {
    body: {
      email: joinedUser.email as string & tags.Format<"email">,
      password: "StrongPassword123!",
    } satisfies IDiscussionBoardRegisteredUser.ILogin,
  });
  typia.assert(loggedInUser);
  // 3. Validate response properties
  // The user should have a valid UUID id
  TestValidator.predicate(
    "user id is a valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      loggedInUser.id,
    ),
  );
  // Email matches
  TestValidator.equals(
    "email matches input",
    loggedInUser.email,
    joinedUser.email,
  );
  // displayName is non-empty string
  TestValidator.predicate(
    "displayName is non-empty",
    typeof loggedInUser.displayName === "string" &&
      loggedInUser.displayName.length > 0,
  );
  // bio can be null or string
  TestValidator.predicate(
    "bio is string or null",
    loggedInUser.bio === null || typeof loggedInUser.bio === "string",
  );
  // user is not banned
  TestValidator.equals("user is not banned", loggedInUser.isBanned, false);
  // Validate token fields
  const token = loggedInUser.token;
  TestValidator.predicate(
    "token.access is non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token.refresh is non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  // Validate ISO 8601 date-time strings for token expiry
  TestValidator.predicate(
    "token.expired_at is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(token.expired_at),
  );
  TestValidator.predicate(
    "token.refreshable_until is ISO 8601",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/.test(
      token.refreshable_until,
    ),
  );
  // Articles and comments array are present
  TestValidator.predicate(
    "articles is array",
    Array.isArray(loggedInUser.articles),
  );
  TestValidator.predicate(
    "comments is array",
    Array.isArray(loggedInUser.comments),
  );
}
