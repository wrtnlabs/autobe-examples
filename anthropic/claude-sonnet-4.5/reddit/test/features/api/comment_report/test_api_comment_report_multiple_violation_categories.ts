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
 * Test reporting comments with various violation categories including
 * 'sexual_content', 'violence', 'personal_information', 'copyright', and
 * 'self_harm'.
 *
 * This test validates the comprehensive comment reporting system by creating
 * multiple comments and having different members report them using different
 * violation categories. The test ensures that each report correctly captures
 * its specific category, maintains proper isolation between reports, and that
 * all reports can coexist in the moderation queue with unique IDs and
 * independent tracking.
 *
 * Steps:
 *
 * 1. Create moderator and authenticate
 * 2. Create community for test content
 * 3. Create multiple member accounts (post creator, commenters, reporters)
 * 4. Create a post in the community
 * 5. Create multiple comments on the post
 * 6. Have different members report different comments with different violation
 *    categories
 * 7. Validate each report has unique ID, correct category, and proper isolation
 */
export async function test_api_comment_report_multiple_violation_categories(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate moderator
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "moderator123",
        nickname: RandomGenerator.name(),
        ip: null,
        href: "https://test.com/moderator/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10) satisfies string &
            tags.MinLength<3> &
            tags.MaxLength<21> &
            tags.Pattern<"^[a-z0-9_]+$">,
          display_title: RandomGenerator.name(2) satisfies string &
            tags.MaxLength<100>,
          description: RandomGenerator.paragraph({
            sentences: 3,
          }) satisfies string & tags.MaxLength<500>,
          rules: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
            tags.MaxLength<500>,
          icon_url: null,
          banner_url: null,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create post creator member
  const postCreatorEmail = typia.random<string & tags.Format<"email">>();
  const postCreator: IRedditCommunityGuest.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<50>,
        email: postCreatorEmail,
        password: "postCreator123",
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
        show_online_status: undefined,
        show_subscribed_communities: undefined,
        show_activity_feed: undefined,
        ip: null,
        href: "https://test.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
  typia.assert(postCreator);

  // Step 4: Create a post in the community
  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<300>,
        post_type: "text" as const,
        body: RandomGenerator.content({ paragraphs: 2 }) satisfies string &
          tags.MaxLength<40000>,
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create multiple commenters and comments
  const commenterEmails = ArrayUtil.repeat(5, (i) =>
    typia.random<string & tags.Format<"email">>(),
  );
  const commenters: IRedditCommunityGuest.IAuthorized[] = [];

  for (const email of commenterEmails) {
    const commenter = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<50>,
        email: email,
        password: "commenter123",
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
        show_online_status: undefined,
        show_subscribed_communities: undefined,
        show_activity_feed: undefined,
        ip: null,
        href: "https://test.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
    typia.assert(commenter);
    commenters.push(commenter);
  }

  // Create 5 comments (one from each commenter)
  const comments: IRedditCommunityComment[] = [];
  for (let i = 0; i < commenters.length; i++) {
    await api.functional.auth.member.login(connection, {
      body: {
        username: undefined,
        email: commenterEmails[i],
        password: "commenter123",
        ip: null,
        href: "https://test.com/member/login" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ILogin,
    });

    const comment =
      await api.functional.redditCommunity.member.posts.comments.create(
        connection,
        {
          postId: post.id,
          body: {
            body: RandomGenerator.paragraph({ sentences: 5 }) satisfies string &
              tags.MinLength<1> &
              tags.MaxLength<10000>,
            parent_comment_id: null,
          } satisfies IRedditCommunityComment.ICreate,
        },
      );
    typia.assert(comment);
    comments.push(comment);
  }

  // Step 6: Create reporters and submit reports with different violation categories
  const categories = [
    "sexual_content",
    "violence",
    "personal_information",
    "copyright",
    "self_harm",
  ] as const;
  const reports: IRedditCommunityReport[] = [];

  for (let i = 0; i < categories.length; i++) {
    const reporterEmail = typia.random<string & tags.Format<"email">>();
    const reporter = await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(10) satisfies string &
          tags.MinLength<3> &
          tags.MaxLength<50>,
        email: reporterEmail,
        password: "reporter123",
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
        show_online_status: undefined,
        show_subscribed_communities: undefined,
        show_activity_feed: undefined,
        ip: null,
        href: "https://test.com/member/join" satisfies string &
          tags.Format<"uri">,
        referrer: "" satisfies string & tags.Format<"uri">,
      } satisfies IRedditCommunityGuest.ICreate,
    });
    typia.assert(reporter);

    const report =
      await api.functional.redditCommunity.member.comments.reports.create(
        connection,
        {
          commentId: comments[i].id,
          body: {
            content_type: "comment" as const,
            target_content_id: comments[i].id,
            reddit_community_community_id: community.id,
            category: categories[i],
            description: `This comment violates ${categories[i]} policy`,
          } satisfies IRedditCommunityReport.ICreate,
        },
      );
    typia.assert(report);
    reports.push(report);
  }

  // Step 7: Validate all reports
  TestValidator.predicate(
    "all reports should have unique IDs",
    reports.length === 5,
  );

  const reportIds = reports.map((r) => r.id);
  const uniqueIds = new Set(reportIds);
  TestValidator.predicate("report IDs must be unique", uniqueIds.size === 5);

  for (let i = 0; i < reports.length; i++) {
    TestValidator.equals(
      `report ${i} should have correct category`,
      reports[i].category,
      categories[i],
    );

    TestValidator.equals(
      `report ${i} should reference correct community`,
      reports[i].reddit_community_community_id,
      community.id,
    );

    TestValidator.equals(
      `report ${i} should have content_type as comment`,
      reports[i].content_type,
      "comment",
    );

    TestValidator.equals(
      `report ${i} should have pending status`,
      reports[i].status,
      "pending",
    );

    TestValidator.predicate(
      `report ${i} should have valid UUID`,
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        reports[i].id,
      ),
    );
  }

  TestValidator.predicate(
    "all reports should coexist independently",
    reports.every((r, idx) => r.category === categories[idx]),
  );
}
