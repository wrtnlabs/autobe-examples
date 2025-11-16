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

export async function test_api_report_resolution_with_action_taken(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.MinLength<8>>();
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      nickname: RandomGenerator.name(),
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 2: Moderator creates a community
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphaNumeric(10),
      email: memberEmail,
      password: memberPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      show_online_status: false,
      show_subscribed_communities: false,
      show_activity_feed: true,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityGuest.ICreate,
  });
  typia.assert(member);

  // Step 4: Member creates a post
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Member creates a comment (this will be reported)
  const comment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          body: "This is a harassing comment that violates community guidelines",
          parent_comment_id: null,
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // Step 6: Member reports the comment for harassment
  const report = await api.functional.redditCommunity.member.reports.create(
    connection,
    {
      body: {
        content_type: "comment",
        target_content_id: comment.id,
        reddit_community_community_id: community.id,
        category: "harassment",
        description:
          "This comment contains threatening and abusive language directed at other users",
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);

  // Validate initial report state
  TestValidator.equals(
    "initial report status is pending",
    report.status,
    "pending",
  );
  TestValidator.equals("initial resolution is null", report.resolution, null);

  // Step 7: Switch to moderator authentication context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 8: Moderator updates the report with resolution
  const moderatorNotes =
    "After reviewing the reported comment, it clearly violates our community harassment policy. The comment contains threatening language and personal attacks. Appropriate action has been taken - the comment has been removed and the user has received a warning.";

  const updatedReport =
    await api.functional.redditCommunity.moderator.reports.update(connection, {
      reportId: report.id,
      body: {
        status: "resolved_action_taken",
        resolution: "approved",
        moderator_notes: moderatorNotes,
      } satisfies IRedditCommunityReport.IUpdate,
    });
  typia.assert(updatedReport);

  // Step 9: Validate all fields are correctly updated
  TestValidator.equals(
    "report status updated to resolved_action_taken",
    updatedReport.status,
    "resolved_action_taken",
  );
  TestValidator.equals(
    "resolution decision is approved",
    updatedReport.resolution,
    "approved",
  );
  TestValidator.equals(
    "moderator notes are recorded",
    updatedReport.moderator_notes,
    moderatorNotes,
  );
  TestValidator.equals(
    "report ID remains the same",
    updatedReport.id,
    report.id,
  );
  TestValidator.equals(
    "content type remains comment",
    updatedReport.content_type,
    "comment",
  );
  TestValidator.equals(
    "category remains harassment",
    updatedReport.category,
    "harassment",
  );
}
