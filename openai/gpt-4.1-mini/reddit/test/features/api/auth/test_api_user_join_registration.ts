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

export async function test_api_user_join_registration(
  connection: api.IConnection,
) {
  // Generate unique random email
  const email = typia.random<string & tags.Format<"email">>();

  // Prepare registration body
  const requestBody = {
    email: email,
    password: "StrongPassword123!",
    ip: null,
    href: "https://example.com/register",
    referrer: "https://example.com",
  } satisfies IRedditCommunityUser.ICreate;

  // Call join operation
  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: requestBody,
    });
  typia.assert(authorizedUser);

  // Validate essential user properties
  TestValidator.predicate(
    "User ID is UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      authorizedUser.id,
    ),
  );
  TestValidator.equals("User email matches", authorizedUser.email, email);
  TestValidator.predicate(
    "Token access is non-empty string",
    typeof authorizedUser.token.access === "string" &&
      authorizedUser.token.access.length > 0,
  );
  TestValidator.predicate(
    "Token refresh is non-empty string",
    typeof authorizedUser.token.refresh === "string" &&
      authorizedUser.token.refresh.length > 0,
  );
  TestValidator.predicate(
    "Token expired_at is a valid ISO date-time string",
    !isNaN(Date.parse(authorizedUser.token.expired_at)),
  );
  TestValidator.predicate(
    "Token refreshable_until is a valid ISO date-time string",
    !isNaN(Date.parse(authorizedUser.token.refreshable_until)),
  );
}
