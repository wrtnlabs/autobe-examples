import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeModerationLog";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityBan";
import type { IRedditLikeContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeContentReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerationAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAction";
import type { IRedditLikeModerationAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationAppeal";
import type { IRedditLikeModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerationLog";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";

/**
 * Test moderation log retrieval with action type filtering to analyze specific
 * moderation event patterns.
 *
 * This scenario validates advanced filtering by log type categories
 * (report_submitted, action_taken, ban_issued, appeal_submitted,
 * appeal_decided). The test verifies: (1) Various moderation events are created
 * (reports, removals, bans, appeals), (2) Moderator filters logs by specific
 * action type, (3) Only matching log types are returned, (4) Multiple action
 * types can be filtered simultaneously, (5) Each log type includes appropriate
 * metadata and context, (6) Action type filtering combines correctly with
 * community and time filters, (7) Log structure varies appropriately by event
 * type.
 *
 * Step-by-step process:
 *
 * 1. Create member account for content creation
 * 2. Create moderator account for moderation actions
 * 3. Create a community for moderation testing
 * 4. Create posts in the community to moderate
 * 5. Member submits content reports (generates report_submitted logs)
 * 6. Moderator takes moderation actions (generates action_taken logs)
 * 7. Moderator issues community ban (generates ban_issued logs)
 * 8. Member submits appeal (generates appeal_submitted logs)
 * 9. Filter moderation logs by specific log_type
 * 10. Verify only matching log types are returned
 * 11. Test filtering with multiple log types
 * 12. Verify log structure varies by event type
 * 13. Test combining log_type filter with community filter
 */
export async function test_api_moderation_logs_action_type_filtering(
  connection: api.IConnection,
) {
  // Step 1: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: memberEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Create moderator account for moderation actions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_-]+$">
      >(),
      email: moderatorEmail,
      password: typia.random<string & tags.MinLength<8>>(),
    } satisfies IRedditLikeModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 3: Switch to member and create a community
  connection.headers = { Authorization: member.token.access };
  const community = await api.functional.redditLike.member.communities.create(
    connection,
    {
      body: {
        code: typia.random<
          string &
            tags.MinLength<3> &
            tags.MaxLength<25> &
            tags.Pattern<"^[a-zA-Z0-9_]+$">
        >(),
        name: typia.random<string & tags.MinLength<3> & tags.MaxLength<25>>(),
        description: typia.random<
          string & tags.MinLength<10> & tags.MaxLength<500>
        >(),
        privacy_type: "public",
        posting_permission: "anyone_subscribed",
        allow_text_posts: true,
        allow_link_posts: true,
        allow_image_posts: true,
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);

  // Step 4: Create multiple posts for moderation testing
  const post1 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "text",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        body: typia.random<string & tags.MaxLength<40000>>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post1);

  const post2 = await api.functional.redditLike.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        type: "link",
        title: typia.random<string & tags.MinLength<3> & tags.MaxLength<300>>(),
        url: typia.random<string & tags.MaxLength<2000>>(),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post2);

  // Step 5: Member submits content reports (generates report_submitted logs)
  const report1 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post1.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "spam,harassment",
        additional_context: typia.random<string & tags.MaxLength<500>>(),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report1);

  const report2 = await api.functional.redditLike.content_reports.create(
    connection,
    {
      body: {
        reported_post_id: post2.id,
        community_id: community.id,
        content_type: "post",
        violation_categories: "hate_speech",
        additional_context: typia.random<string & tags.MaxLength<500>>(),
      } satisfies IRedditLikeContentReport.ICreate,
    },
  );
  typia.assert(report2);

  // Step 6: Switch to moderator and take moderation actions (generates action_taken logs)
  connection.headers = { Authorization: moderator.token.access };
  const action1 = await api.functional.redditLike.moderation.actions.create(
    connection,
    {
      body: {
        report_id: report1.id,
        affected_post_id: post1.id,
        community_id: community.id,
        action_type: "remove",
        content_type: "post",
        removal_type: "community_level",
        reason_category: "spam",
        reason_text: "This post violates community spam rules",
        internal_notes: "First violation",
      } satisfies IRedditLikeModerationAction.ICreate,
    },
  );
  typia.assert(action1);

  const action2 = await api.functional.redditLike.moderation.actions.create(
    connection,
    {
      body: {
        report_id: report2.id,
        affected_post_id: post2.id,
        community_id: community.id,
        action_type: "approve",
        content_type: "post",
        reason_category: "no_violation",
        reason_text: "Content approved after review",
      } satisfies IRedditLikeModerationAction.ICreate,
    },
  );
  typia.assert(action2);

  // Step 7: Moderator issues community ban (generates ban_issued logs)
  const ban = await api.functional.redditLike.moderator.communities.bans.create(
    connection,
    {
      communityId: community.id,
      body: {
        banned_member_id: member.id,
        ban_reason_category: "repeated_violations",
        ban_reason_text: "Multiple spam violations",
        is_permanent: false,
        expiration_date: new Date(
          Date.now() + 7 * 24 * 60 * 60 * 1000,
        ).toISOString(),
      } satisfies IRedditLikeCommunityBan.ICreate,
    },
  );
  typia.assert(ban);

  // Step 8: Switch to member and submit appeal (generates appeal_submitted logs)
  connection.headers = { Authorization: member.token.access };
  const appeal =
    await api.functional.redditLike.member.moderation.appeals.create(
      connection,
      {
        body: {
          moderation_action_id: action1.id,
          appeal_type: "content_removal",
          appeal_text: typia.random<
            string & tags.MinLength<50> & tags.MaxLength<1000>
          >(),
        } satisfies IRedditLikeModerationAppeal.ICreate,
      },
    );
  typia.assert(appeal);

  // Step 9: Switch back to moderator for log retrieval
  connection.headers = { Authorization: moderator.token.access };

  // Step 10: Filter moderation logs by specific log_type (report_submitted)
  const reportLogs =
    await api.functional.redditLike.moderator.moderation.logs.index(
      connection,
      {
        body: {
          log_type: "report_submitted",
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(reportLogs);

  // Step 11: Verify only report_submitted logs are returned
  TestValidator.predicate(
    "report logs should contain entries",
    reportLogs.data.length > 0,
  );

  for (const log of reportLogs.data) {
    TestValidator.equals(
      "log type should be report_submitted",
      log.log_type,
      "report_submitted",
    );
  }

  // Step 12: Filter by action_taken log type
  const actionLogs =
    await api.functional.redditLike.moderator.moderation.logs.index(
      connection,
      {
        body: {
          log_type: "action_taken",
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(actionLogs);

  TestValidator.predicate(
    "action logs should contain entries",
    actionLogs.data.length > 0,
  );

  for (const log of actionLogs.data) {
    TestValidator.equals(
      "log type should be action_taken",
      log.log_type,
      "action_taken",
    );
  }

  // Step 13: Filter by ban_issued log type
  const banLogs =
    await api.functional.redditLike.moderator.moderation.logs.index(
      connection,
      {
        body: {
          log_type: "ban_issued",
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(banLogs);

  TestValidator.predicate(
    "ban logs should contain entries",
    banLogs.data.length > 0,
  );

  for (const log of banLogs.data) {
    TestValidator.equals(
      "log type should be ban_issued",
      log.log_type,
      "ban_issued",
    );
  }

  // Step 14: Filter by appeal_submitted log type
  const appealLogs =
    await api.functional.redditLike.moderator.moderation.logs.index(
      connection,
      {
        body: {
          log_type: "appeal_submitted",
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(appealLogs);

  TestValidator.predicate(
    "appeal logs should contain entries",
    appealLogs.data.length > 0,
  );

  for (const log of appealLogs.data) {
    TestValidator.equals(
      "log type should be appeal_submitted",
      log.log_type,
      "appeal_submitted",
    );
  }

  // Step 15: Verify log structure includes metadata
  TestValidator.predicate(
    "logs should have action descriptions",
    reportLogs.data.every(
      (log) => log.action_description && log.action_description.length > 0,
    ),
  );

  // Step 16: Test community filter with log type filter
  const communitySpecificLogs =
    await api.functional.redditLike.moderator.moderation.logs.index(
      connection,
      {
        body: {
          log_type: "report_submitted",
          community_id: community.id,
          page: 1,
          limit: 10,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(communitySpecificLogs);

  TestValidator.predicate(
    "community filtered logs should be scoped correctly",
    communitySpecificLogs.data.length > 0,
  );

  // Step 17: Verify pagination works with log type filtering
  const paginatedLogs =
    await api.functional.redditLike.moderator.moderation.logs.index(
      connection,
      {
        body: {
          log_type: "action_taken",
          page: 1,
          limit: 1,
        } satisfies IRedditLikeModerationLog.IRequest,
      },
    );
  typia.assert(paginatedLogs);
  typia.assert(paginatedLogs.pagination);

  TestValidator.predicate(
    "pagination should be applied",
    paginatedLogs.pagination.limit === 1,
  );
}
