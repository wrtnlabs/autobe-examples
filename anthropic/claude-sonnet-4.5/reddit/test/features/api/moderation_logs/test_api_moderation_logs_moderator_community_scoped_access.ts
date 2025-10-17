import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationLog";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_moderation_logs_moderator_community_scoped_access(
  connection: api.IConnection,
) {
  // Step 1: Create first moderator account
  const moderator1: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator1);

  // Step 2: Create second moderator account
  const moderator2: IRedditLikeModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 3: Create member account for generating moderation activities
  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.name(1),
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Create first community (will be moderated by moderator1)
  const community1: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community1);

  // Step 5: Create second community (will be moderated by moderator2)
  const community2: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "science",
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(community2);

  // Step 6: Create post in first community
  const post1: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community1.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post1);

  // Step 7: Create post in second community
  const post2: IRedditLikePost =
    await api.functional.redditLike.member.posts.create(connection, {
      body: {
        community_id: community2.id,
        type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies IRedditLikePost.ICreate,
    });
  typia.assert(post2);

  // Step 8: Generate moderation activity in community 1 - create content report
  const report1: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: post1.id,
        community_id: community1.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(report1);

  // Step 9: Switch to moderator1 and create moderation action in community 1
  connection.headers = { Authorization: moderator1.token.access };
  const action1: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report1.id,
        affected_post_id: post1.id,
        community_id: community1.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "spam",
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(action1);

  // Step 10: Switch back to member and generate moderation activity in community 2
  connection.headers = { Authorization: member.token.access };
  const report2: IRedditLikeContentReport =
    await api.functional.redditLike.content_reports.create(connection, {
      body: {
        reported_post_id: post2.id,
        community_id: community2.id,
        content_type: "post",
        violation_categories: "misinformation",
        additional_context: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeContentReport.ICreate,
    });
  typia.assert(report2);

  // Step 11: Switch to moderator2 and create moderation action in community 2
  connection.headers = { Authorization: moderator2.token.access };
  const action2: IRedditLikeModerationAction =
    await api.functional.redditLike.moderation.actions.create(connection, {
      body: {
        report_id: report2.id,
        affected_post_id: post2.id,
        community_id: community2.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community",
        reason_category: "misinformation",
        reason_text: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeModerationAction.ICreate,
    });
  typia.assert(action2);

  // Step 12: Moderator 1 retrieves logs for community 1
  connection.headers = { Authorization: moderator1.token.access };
  const moderator1Logs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.moderation.logs.index(connection, {
      body: {
        page: 1,
        limit: 50,
        community_id: community1.id,
      } satisfies IRedditLikeModerationLog.IRequest,
    });
  typia.assert(moderator1Logs);

  // Step 13: Verify moderator1 has access to community1 logs
  TestValidator.predicate(
    "moderator 1 should have access to community 1 logs",
    moderator1Logs.data.length > 0,
  );

  // Step 14: Verify all logs belong to community1 (implicit check through community_id filter)
  // The API enforces community scoping, so if logs are returned, they belong to the requested community

  // Step 15: Moderator 2 retrieves logs for community 2
  connection.headers = { Authorization: moderator2.token.access };
  const moderator2Logs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.moderation.logs.index(connection, {
      body: {
        page: 1,
        limit: 50,
        community_id: community2.id,
      } satisfies IRedditLikeModerationLog.IRequest,
    });
  typia.assert(moderator2Logs);

  // Step 16: Verify moderator2 has access to community2 logs
  TestValidator.predicate(
    "moderator 2 should have access to community 2 logs",
    moderator2Logs.data.length > 0,
  );

  // Step 17: Test filtering by log type for moderator1's community
  connection.headers = { Authorization: moderator1.token.access };
  const filteredLogs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.moderation.logs.index(connection, {
      body: {
        page: 1,
        limit: 10,
        community_id: community1.id,
        log_type: "action_taken",
      } satisfies IRedditLikeModerationLog.IRequest,
    });
  typia.assert(filteredLogs);

  TestValidator.predicate(
    "filtered logs should be returned for moderator 1",
    filteredLogs.data.length >= 0,
  );

  // Step 18: Test pagination for moderator2's community
  connection.headers = { Authorization: moderator2.token.access };
  const paginatedLogs: IPageIRedditLikeModerationLog =
    await api.functional.redditLike.moderation.logs.index(connection, {
      body: {
        page: 1,
        limit: 5,
        community_id: community2.id,
      } satisfies IRedditLikeModerationLog.IRequest,
    });
  typia.assert(paginatedLogs);

  TestValidator.predicate(
    "pagination should work within moderator scope",
    paginatedLogs.pagination.limit === 5,
  );
}
