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
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

export async function test_api_community_moderation_log_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate as administrator
  const adminPassword = RandomGenerator.alphaNumeric(10) + "A1!";
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: adminPassword,
    } satisfies IRedditLikeAdmin.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create and authenticate as member for content creation
  const memberPassword = RandomGenerator.alphaNumeric(10) + "A1!";
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: memberPassword,
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 3: Create a test community as member
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: RandomGenerator.alphabets(15),
        name: RandomGenerator.name(3),
        description: RandomGenerator.paragraph({ sentences: 5 }),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
        primary_category: "technology",
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Create multiple posts in the community
  const posts: IRedditLikePost[] = await ArrayUtil.asyncRepeat(3, async () => {
    const post = await api.functional.redditLike.member.posts.create(
      connection,
      {
        body: {
          community_id: community.id,
          type: "text",
          title: RandomGenerator.paragraph({ sentences: 2 }),
          body: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies IRedditLikePost.ICreate,
      },
    );
    typia.assert(post);
    return post;
  });

  // Step 5: Create content reports on posts
  const reports: IRedditLikeContentReport[] = await ArrayUtil.asyncRepeat(
    2,
    async (index) => {
      const report = await api.functional.redditLike.content_reports.create(
        connection,
        {
          body: {
            reported_post_id: posts[index].id,
            community_id: community.id,
            content_type: "post",
            violation_categories: "spam,harassment",
            additional_context: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies IRedditLikeContentReport.ICreate,
        },
      );
      typia.assert(report);
      return report;
    },
  );

  // Step 6: Create moderation actions as member (who is community creator/moderator)
  const actions: IRedditLikeModerationAction[] = await ArrayUtil.asyncRepeat(
    2,
    async (index) => {
      const action = await api.functional.redditLike.moderation.actions.create(
        connection,
        {
          body: {
            report_id: reports[index].id,
            affected_post_id: posts[index].id,
            community_id: community.id,
            action_type: index === 0 ? "remove" : "approve",
            content_type: "post",
            removal_type: index === 0 ? "community" : undefined,
            reason_category: index === 0 ? "spam" : "false_report",
            reason_text: RandomGenerator.paragraph({ sentences: 2 }),
            internal_notes: RandomGenerator.paragraph({ sentences: 1 }),
          } satisfies IRedditLikeModerationAction.ICreate,
        },
      );
      typia.assert(action);
      return action;
    },
  );

  // Step 7: Re-authenticate as admin to test platform-wide access
  await api.functional.auth.admin.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(12),
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10) + "A1!",
    } satisfies IRedditLikeAdmin.ICreate,
  });

  // Step 8: Retrieve moderation logs as administrator
  const moderationLogs =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(moderationLogs);

  // Step 9: Validate pagination structure
  TestValidator.predicate(
    "moderation log has valid pagination",
    moderationLogs.pagination !== null &&
      moderationLogs.pagination !== undefined,
  );
  TestValidator.predicate(
    "moderation log has data array",
    Array.isArray(moderationLogs.data),
  );
  TestValidator.predicate(
    "pagination has current page",
    moderationLogs.pagination.current === 1,
  );

  // Step 10: Validate that moderation events are recorded
  TestValidator.predicate(
    "moderation log contains entries",
    moderationLogs.data.length > 0,
  );

  // Step 11: Validate log entry structure and content
  for (const logEntry of moderationLogs.data) {
    TestValidator.predicate(
      "log entry has valid id",
      typeof logEntry.id === "string" && logEntry.id.length > 0,
    );
    TestValidator.predicate(
      "log entry has log_type",
      typeof logEntry.log_type === "string" && logEntry.log_type.length > 0,
    );
    TestValidator.predicate(
      "log entry has action_description",
      typeof logEntry.action_description === "string" &&
        logEntry.action_description.length > 0,
    );
    TestValidator.predicate(
      "log entry has created_at timestamp",
      typeof logEntry.created_at === "string" && logEntry.created_at.length > 0,
    );
  }

  // Step 12: Test filtering by log type
  const filteredLogs =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 10,
          log_type: "action_taken",
          community_id: community.id,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(filteredLogs);

  // Step 13: Validate filtered results
  TestValidator.predicate(
    "filtered log has data array",
    Array.isArray(filteredLogs.data),
  );

  // Step 14: Test pagination with different page sizes
  const paginatedLogs =
    await api.functional.redditLike.admin.communities.moderation_log.index(
      connection,
      {
        communityId: community.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);

  TestValidator.predicate(
    "paginated results respect limit",
    paginatedLogs.data.length <= 5,
  );

  // Step 15: Verify pagination metadata
  TestValidator.predicate(
    "pagination limit is correct",
    paginatedLogs.pagination.limit === 5,
  );
}
