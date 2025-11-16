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

export async function test_api_report_detail_with_resolution(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as moderator
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

  // Step 2: Create community as moderator
  const community =
    await api.functional.redditCommunity.moderator.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          display_title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          rules: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          banner_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 3: Authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = typia.random<string & tags.MinLength<8>>();
  const member = await api.functional.auth.member.join(connection, {
    body: {
      username: RandomGenerator.alphabets(10),
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

  // Step 4: Create a post as member
  const post = await api.functional.redditCommunity.member.posts.create(
    connection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.name(5),
        post_type: "text",
        body: RandomGenerator.content({ paragraphs: 2 }),
        url: null,
        image_url: null,
      } satisfies IRedditCommunityPost.ICreate,
    },
  );
  typia.assert(post);

  // Step 5: Submit a report for the post with category 'spam'
  const reportDescription = RandomGenerator.paragraph({ sentences: 2 });
  const report = await api.functional.redditCommunity.member.reports.create(
    connection,
    {
      body: {
        content_type: "post",
        target_content_id: post.id,
        reddit_community_community_id: community.id,
        category: "spam",
        description: reportDescription,
      } satisfies IRedditCommunityReport.ICreate,
    },
  );
  typia.assert(report);

  // Step 6: Authenticate back as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      ip: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditCommunityCommunityModerator.ILogin,
  });

  // Step 7: Update the report status to 'resolved_action_taken' with resolution and notes
  const moderatorNotes = RandomGenerator.paragraph({ sentences: 3 });
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

  // Step 8: Retrieve the updated report by its ID
  const retrievedReport =
    await api.functional.redditCommunity.moderator.reports.at(connection, {
      reportId: report.id,
    });
  typia.assert(retrievedReport);

  // Step 9: Validate report.status is 'resolved_action_taken'
  TestValidator.equals(
    "report status should be resolved_action_taken",
    retrievedReport.status,
    "resolved_action_taken",
  );

  // Step 10: Verify report.resolution is 'approved'
  TestValidator.equals(
    "report resolution should be approved",
    retrievedReport.resolution,
    "approved",
  );

  // Step 11: Verify report.moderator_notes contains the notes added during review
  TestValidator.equals(
    "moderator notes should match",
    retrievedReport.moderator_notes,
    moderatorNotes,
  );

  // Step 12: Verify report.updated_at is later than report.created_at
  TestValidator.predicate(
    "updated_at should be later than or equal to created_at",
    new Date(retrievedReport.updated_at).getTime() >=
      new Date(retrievedReport.created_at).getTime(),
  );

  // Step 13: Verify all original report data remains intact
  TestValidator.equals(
    "report category should remain spam",
    retrievedReport.category,
    "spam",
  );
  TestValidator.equals(
    "report description should be preserved",
    retrievedReport.description,
    reportDescription,
  );
  TestValidator.equals(
    "reporter member ID should be preserved",
    retrievedReport.reddit_community_member_id,
    member.id,
  );

  // Step 14: Validate the full report lifecycle is properly tracked
  TestValidator.equals(
    "report ID should match original",
    retrievedReport.id,
    report.id,
  );
}
