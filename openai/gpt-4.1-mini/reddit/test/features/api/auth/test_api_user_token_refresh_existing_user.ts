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

/**
 * Test the token refresh workflow for a registered user.
 *
 * This scenario first creates a new user with the join operation to establish a
 * fresh authentication context. Then, using the issued refresh token, it calls
 * the token refresh endpoint to obtain a new access token. Validates that the
 * new access token is received successfully and the user session remains valid.
 * Ensures secure token renewal without requiring full login again.
 */
export async function test_api_user_token_refresh_existing_user(
  connection: api.IConnection,
) {
  // 1. Create a new user via the join endpoint
  const ipAddress = "127.0.0.1";
  const currentHref = "https://reddit.example.com/welcome";
  const refererUrl = "https://reddit.example.com/login";

  const userCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    ip: ipAddress,
    href: currentHref,
    referrer: refererUrl,
  } satisfies IRedditCommunityUser.ICreate;

  const authorizedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: userCreateBody,
    });
  typia.assert(authorizedUser);

  // 2. Refresh the token using the refresh token issued
  const refreshBody = {
    refresh_token: authorizedUser.token.refresh,
    ip: ipAddress,
    href: currentHref,
    referrer: refererUrl,
  } satisfies IRedditCommunityUser.IRefresh;

  const refreshedUser: IRedditCommunityUser.IAuthorized =
    await api.functional.auth.user.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshedUser);

  // 3. Validate the tokens
  TestValidator.predicate(
    "new access token received",
    typeof refreshedUser.token.access === "string" &&
      refreshedUser.token.access.length > 0,
  );

  TestValidator.equals(
    "user ID remains the same",
    refreshedUser.id,
    authorizedUser.id,
  );
}
