import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityVisibilityLevel } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityVisibilityLevel";
import type { ICommunityPlatformMemberuser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberuser";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";
import type { ICommunityPlatformPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostType";
import type { ICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVotingRateLimit";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVotingRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVotingRateLimit";

export async function test_api_voting_rate_limits_index_for_member_user_with_single_window(
  connection: api.IConnection,
) {
  // 1. Authenticate as a new platform administrator (join)
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    ip: "127.0.0.1",
    href: "https://admin.console.test/platform-admin/join",
    referrer: "https://admin.console.test/",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<ICommunityPlatformPlatformadmin.IAuthorized>(admin);
  typia.assert<IAuthorizationToken>(admin.token);
  typia.assert<ICommunityPlatformAccountStatus.ISummary>(admin.accountStatus);

  // 2. Create a community visibility level master record
  const visibilityCreateBody = {
    code: `vis_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies ICommunityPlatformCommunityVisibilityLevel.ICreate;

  const visibilityLevel: ICommunityPlatformCommunityVisibilityLevel =
    await api.functional.communityPlatform.platformAdmin.communityVisibilityLevels.create(
      connection,
      {
        body: visibilityCreateBody,
      },
    );
  typia.assert<ICommunityPlatformCommunityVisibilityLevel>(visibilityLevel);

  // 3. Create a post type master record
  const postTypeCreateBody = {
    code: `post_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.name(1),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformPostType.ICreate;

  const postType: ICommunityPlatformPostType =
    await api.functional.communityPlatform.platformAdmin.postTypes.create(
      connection,
      {
        body: postTypeCreateBody,
      },
    );
  typia.assert<ICommunityPlatformPostType>(postType);

  // 4. Choose a memberUserId (UUID) for which to manage voting rate limits
  const memberUserId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 5. Create a single voting rate limit window for this member user
  const now = new Date();
  const oneHourLater = new Date(now.getTime() + 60 * 60 * 1000);
  const windowStart = now.toISOString();
  const windowEnd = oneHourLater.toISOString();

  const votingRateLimitCreateBody = {
    scope_type: "global",
    community_platform_community_id: null,
    window_start: windowStart,
    window_end: windowEnd,
    allowed_post_votes: 10,
    allowed_comment_votes: 20,
    post_votes_count: 3,
    comment_votes_count: 5,
  } satisfies ICommunityPlatformVotingRateLimit.ICreate;

  const createdWindow: ICommunityPlatformVotingRateLimit =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.create(
      connection,
      {
        memberUserId,
        body: votingRateLimitCreateBody,
      },
    );
  typia.assert<ICommunityPlatformVotingRateLimit>(createdWindow);

  // 6. Index voting rate limits for the same member user
  const page: IPageICommunityPlatformVotingRateLimit.ISummary =
    await api.functional.communityPlatform.platformAdmin.memberUsers.votingRateLimits.index(
      connection,
      {
        memberUserId,
      },
    );
  typia.assert<IPageICommunityPlatformVotingRateLimit.ISummary>(page);

  const pagination: IPage.IPagination = page.pagination;
  typia.assert<IPage.IPagination>(pagination);

  // 7. Validate pagination metadata for a single record
  TestValidator.equals(
    "pagination.records must be 1 when exactly one voting rate limit window exists",
    pagination.records,
    1,
  );
  TestValidator.equals(
    "pagination.pages must be 1 when a single record exists",
    pagination.pages,
    1,
  );
  TestValidator.predicate(
    "pagination.limit should be at least 1",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination.current should be non-negative (0 or 1+ depending on backend convention)",
    pagination.current >= 0,
  );

  // 8. Validate that a single summary record is returned and matches created window
  TestValidator.equals(
    "data array must contain exactly one voting rate limit summary",
    page.data.length,
    1,
  );

  const summary: ICommunityPlatformVotingRateLimit.ISummary = page.data[0];
  typia.assert<ICommunityPlatformVotingRateLimit.ISummary>(summary);

  // ID consistency
  TestValidator.equals(
    "summary.id must match created window id",
    summary.id,
    createdWindow.id,
  );

  // Member user consistency
  TestValidator.equals(
    "summary.memberUser.id must equal the memberUserId used in path",
    summary.memberUser.id,
    memberUserId,
  );

  // Scope and community consistency
  TestValidator.equals(
    "summary.scope_type must equal created window scope_type",
    summary.scope_type,
    createdWindow.scope_type,
  );
  TestValidator.equals(
    "summary.community_id should be null for a global scope window",
    summary.community_id ?? null,
    createdWindow.community?.id ?? null,
  );

  // Time window consistency
  TestValidator.equals(
    "summary.window_start must equal created window window_start",
    summary.window_start,
    createdWindow.window_start,
  );
  TestValidator.equals(
    "summary.window_end must equal created window window_end",
    summary.window_end,
    createdWindow.window_end,
  );

  // Vote count consistency
  TestValidator.equals(
    "summary.post_votes_count must equal created window post_votes_count",
    summary.post_votes_count,
    createdWindow.post_votes_count,
  );
  TestValidator.equals(
    "summary.comment_votes_count must equal created window comment_votes_count",
    summary.comment_votes_count,
    createdWindow.comment_votes_count,
  );

  // Timestamp consistency
  TestValidator.equals(
    "summary.created_at must equal created window created_at",
    summary.created_at,
    createdWindow.created_at,
  );
  TestValidator.equals(
    "summary.updated_at must equal created window updated_at",
    summary.updated_at,
    createdWindow.updated_at,
  );
}
