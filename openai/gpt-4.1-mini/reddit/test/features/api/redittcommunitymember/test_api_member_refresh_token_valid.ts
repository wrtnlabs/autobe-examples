import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Validate the refreshing of JWT access tokens for authenticated Reddit
 * community member users.
 *
 * This e2e test performs the following steps:
 *
 * 1. Registers a new member user via POST /auth/member/join with a valid email and
 *    password.
 * 2. Asserts the returned authorized user response with tokens.
 * 3. Extracts the refresh token from the authorized response.
 * 4. Calls POST /auth/member/refresh endpoint with the refresh token to obtain new
 *    tokens.
 * 5. Asserts the refreshed authorized user response to ensure tokens are valid.
 *
 * This test ensures the token refreshing mechanism provides continuous
 * authenticated sessions without requiring re-login.
 */
export async function test_api_member_refresh_token_valid(
  connection: api.IConnection,
) {
  // Step 1: Member registration
  const memberCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IRedditCommunityMember.ICreate;

  const authorized: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberCreateBody,
    });
  typia.assert(authorized);

  // Step 2: Extract refresh token
  const refreshToken: string = authorized.token.refresh;

  // Step 3: Refresh tokens using refresh token
  const refreshBody = {
    refresh_token: refreshToken,
  } satisfies IRedditCommunityMember.IRefresh;

  const refreshed: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.refresh(connection, {
      body: refreshBody,
    });
  typia.assert(refreshed);

  // Step 4: Validate continuity - refreshed tokens differ from first tokens
  TestValidator.notEquals(
    "access token should be refreshed",
    refreshed.token.access,
    authorized.token.access,
  );
  TestValidator.notEquals(
    "refresh token should be refreshed",
    refreshed.token.refresh,
    authorized.token.refresh,
  );
}
