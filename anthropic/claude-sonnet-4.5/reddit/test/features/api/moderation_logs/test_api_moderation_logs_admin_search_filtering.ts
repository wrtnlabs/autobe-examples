import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationLog";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_moderation_logs_admin_search_filtering(
  connection: api.IConnection,
) {
  // 1. Create administrator account for authenticated access
  const adminData = {
    username:
      RandomGenerator.name(1)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "") + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8) + "A1!",
  } satisfies IRedditLikeAdmin.ICreate;

  const admin: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // 2. Create member account for generating member-originated moderation events
  const memberData = {
    username:
      RandomGenerator.name(1)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "") + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8) + "B2!",
  } satisfies IRedditLikeMember.ICreate;

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // 3. Create test community to provide context for moderation log entries
  const communityData = {
    code: RandomGenerator.alphabets(8).toLowerCase(),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 5,
      wordMax: 8,
    }),
    privacy_type: "public",
    posting_permission: "anyone_subscribed",
    allow_text_posts: true,
    allow_link_posts: true,
    allow_image_posts: true,
  } satisfies IRedditLikeCommunity.ICreate;

  const community: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: communityData,
    });
  typia.assert(community);

  // 4. Create post to enable content reporting
  const postData = {
    community_id: community.id,
    type: "text",
    title: RandomGenerator.paragraph({ sentences: 2 }),
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 5,
      sentenceMax: 10,
    }),
  } satisfies IRedditLikePost.ICreate;

  const post: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: postData,
    });
  typia.assert(post);

  // 5. Create content report to generate moderation log entries
  const reportData = {
    reported_post_id: post.id,
    community_id: community.id,
    content_type: "post",
    violation_categories: "spam,harassment",
    additional_context: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeContentReport.ICreate;

  const report: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: reportData,
    });
  typia.assert(report);

  // 6. Create moderator account for generating moderator-originated actions
  const moderatorData = {
    username:
      RandomGenerator.name(1)
        .toLowerCase()
        .replace(/[^a-z0-9_-]/g, "") + RandomGenerator.alphaNumeric(4),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(8) + "C3!",
  } satisfies IRedditLikeModerator.ICreate;

  const moderator: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: moderatorData,
    });
  typia.assert(moderator);

  // 7. Create moderation action to generate additional log entries
  const actionData = {
    report_id: report.id,
    affected_post_id: post.id,
    community_id: community.id,
    action_type: "remove",
    content_type: "post",
    removal_type: "community",
    reason_category: "spam",
    reason_text: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IRedditLikeModerationAction.ICreate;

  const moderationAction: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: actionData,
    });
  typia.assert(moderationAction);

  // Switch to admin account for accessing moderation logs
  const adminReauth: IRedditLikeAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminData,
    });
  typia.assert(adminReauth);

  // 8. Search moderation logs without filters
  const allLogsRequest = {
    page: 1,
    limit: 10,
  } satisfies IRedditLikeModerationLog.IRequest;

  const allLogsResult: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: allLogsRequest,
    });
  typia.assert(allLogsResult);

  // Validate pagination structure
  TestValidator.predicate(
    "all logs result has valid pagination",
    allLogsResult.pagination.current === 1 &&
      allLogsResult.pagination.limit === 10,
  );

  TestValidator.predicate(
    "all logs result has data array",
    Array.isArray(allLogsResult.data),
  );

  // 9. Search moderation logs filtered by community
  const communityFilterRequest = {
    page: 1,
    limit: 10,
    community_id: community.id,
  } satisfies IRedditLikeModerationLog.IRequest;

  const communityLogsResult: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: communityFilterRequest,
    });
  typia.assert(communityLogsResult);

  TestValidator.predicate(
    "community filtered logs returned successfully",
    Array.isArray(communityLogsResult.data),
  );

  // 10. Test pagination with different page sizes
  const paginationRequest = {
    page: 1,
    limit: 5,
  } satisfies IRedditLikeModerationLog.IRequest;

  const paginatedResult: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.admin.moderation.logs.index(connection, {
      body: paginationRequest,
    });
  typia.assert(paginatedResult);

  TestValidator.equals(
    "pagination limit matches request",
    paginatedResult.pagination.limit,
    5,
  );

  TestValidator.predicate(
    "paginated data respects limit",
    paginatedResult.data.length <= 5,
  );
}
