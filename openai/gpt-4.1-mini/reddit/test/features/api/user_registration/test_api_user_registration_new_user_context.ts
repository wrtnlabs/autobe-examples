import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import type { IRedditCommunityUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUser";
import type { IRedditCommunityUserSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserSession";

export async function test_api_user_registration_new_user_context(
  connection: api.IConnection,
) {
  // Step 1: Prepare a valid new user registration payload
  const registrationBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null, // explicitly null as optional
    href: `https://example.com/signup`,
    referrer: `https://example.com`,
  } satisfies IRedditCommunityUser.ICreate;

  // Step 2: Call the join API to register the user
  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: registrationBody,
    });
  typia.assert(authorizedUser);

  // Regex for ISO 8601 date-time format validation
  const isoDateRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?Z$/;

  // Step 3: Validate authorized user properties
  TestValidator.predicate(
    "user ID is a non-empty UUID string",
    typeof authorizedUser.id === "string" && authorizedUser.id.length > 0,
  );
  TestValidator.predicate(
    "user email matches registration email",
    authorizedUser.email === registrationBody.email,
  );
  TestValidator.predicate(
    "user created_at is ISO date-time",
    typeof authorizedUser.created_at === "string" &&
      isoDateRegex.test(authorizedUser.created_at),
  );
  TestValidator.predicate(
    "user updated_at is ISO date-time",
    typeof authorizedUser.updated_at === "string" &&
      isoDateRegex.test(authorizedUser.updated_at),
  );
  TestValidator.predicate(
    "user token exists",
    authorizedUser.token !== undefined && authorizedUser.token !== null,
  );

  // Step 4: Validate the token object
  const token: IAuthorizationToken = authorizedUser.token;
  TestValidator.predicate(
    "token access is a non-empty string",
    typeof token.access === "string" && token.access.length > 0,
  );
  TestValidator.predicate(
    "token refresh is a non-empty string",
    typeof token.refresh === "string" && token.refresh.length > 0,
  );
  TestValidator.predicate(
    "token expired_at is ISO date-time string",
    typeof token.expired_at === "string" && isoDateRegex.test(token.expired_at),
  );
  TestValidator.predicate(
    "token refreshable_until is ISO date-time string",
    typeof token.refreshable_until === "string" &&
      isoDateRegex.test(token.refreshable_until),
  );
}
