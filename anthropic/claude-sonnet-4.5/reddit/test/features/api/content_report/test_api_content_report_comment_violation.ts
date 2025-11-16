import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunity";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";

/**
 * Test the complete workflow of a member reporting a comment for violating
 * community rules.
 *
 * This scenario validates the polymorphic content reporting system where
 * members can flag inappropriate comment content for moderator review. The test
 * creates a full content hierarchy: moderator creates community, member creates
 * post and comment, third member reports the comment.
 *
 * Workflow:
 *
 * 1. Moderator joins and creates community
 * 2. Member A joins, creates post in community
 * 3. Member A creates comment on their post
 * 4. Member B joins and reports Member A's comment as violation
 * 5. Validate report created with correct polymorphic structure
 */
export async function test_api_content_report_comment_violation(
  connection: api.IConnection,
) {
  // Step 1: Moderator joins and creates community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: RandomGenerator.alphaNumeric(12),
        nickname: RandomGenerator.name(),
        ip: null,
        href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: `https://example.com/icon/${RandomGenerator.alphaNumeric(8)}.png`,
          banner_url: `https://example.com/banner/${RandomGenerator.alphaNumeric(8)}.jpg`,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 2: Member A joins and creates post
  const memberAEmail = typia.random<string & tags.Format<"email">>();
  const memberA: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberAEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.jpg`,
        show_online_status: false,
        show_subscribed_communities: false,
        show_activity_feed: true,
        ip: null,
        href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(memberA);

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 4,
          wordMax: 8,
        }),
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 3: Member A creates comment on their post
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 4,
            wordMax: 8,
          }),
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 4: Member B joins (reporter)
  const memberBEmail = typia.random<string & tags.Format<"email">>();
  const memberB: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10),
        email: memberBEmail,
        password: RandomGenerator.alphaNumeric(12),
        display_name: RandomGenerator.name(),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        avatar_url: `https://example.com/avatar/${RandomGenerator.alphaNumeric(8)}.jpg`,
        show_online_status: true,
        show_subscribed_communities: true,
        show_activity_feed: true,
        ip: null,
        href: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
        referrer: `https://example.com/${RandomGenerator.alphaNumeric(8)}`,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(memberB);

  // Step 5: Member B reports the comment
  const violationCategories = [
    "spam",
    "harassment",
    "hate_speech",
    "misinformation",
    "sexual_content",
    "violence",
    "personal_information",
    "copyright",
    "self_harm",
    "other",
  ] as const;
  const selectedCategory = RandomGenerator.pick(violationCategories);

  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.member.reports.create(connection, {
      body: {
        content_type: "comment" as const,
        target_content_id: comment.id,
        reddit_community_community_id: community.id,
        category: selectedCategory,
        description: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 5,
          wordMax: 10,
        }),
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report);

  // Step 6: Validate report structure
  TestValidator.equals(
    "report content type is comment",
    report.content_type,
    "comment",
  );
  TestValidator.equals("report status is pending", report.status, "pending");
  TestValidator.equals(
    "report community matches",
    report.reddit_community_community_id,
    community.id,
  );
  TestValidator.equals(
    "report category matches",
    report.category,
    selectedCategory,
  );
  TestValidator.equals(
    "reporter is member B",
    report.reddit_community_member_id,
    memberB.id,
  );
  TestValidator.predicate(
    "report has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      report.id,
    ),
  );
}
