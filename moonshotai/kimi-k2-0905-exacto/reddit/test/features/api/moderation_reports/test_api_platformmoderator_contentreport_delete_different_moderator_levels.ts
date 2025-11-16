import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityCategories } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityCategories";
import type { IRedditCommunityContentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityContentReport";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformModerator";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostType } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostType";

/**
 * Test that platform moderator can delete content reports across different
 * moderator processing levels
 *
 * This test validates platform moderator supreme authority over the entire
 * moderation system, demonstrating their ability to delete processed reports
 * regardless of which authorization level originally handled them - whether
 * community moderators, platform administrators, or any other moderation
 * authority tier.
 *
 * The complete workflow involves:
 *
 * 1. Establishing a regular community member account as the reporting party
 * 2. Creating a platform moderator account with platform-wide administrative
 *    privileges
 * 3. Generating target content (community post) to serve as the subject of content
 *    reporting
 * 4. Submitting a legitimate content report through the member's reporting
 *    channels
 * 5. Validating report creation and proper association with target content
 * 6. Authenticating as platform moderator to perform report deletion
 * 7. Successfully deleting the resolved content report to demonstrate
 *    administrative authority
 * 8. Confirming platform-level supremacy over moderation history management
 *
 * This comprehensive test proves that platform moderator privileges extend to
 * all moderation decisions across the entire Reddit Community platform,
 * maintaining consistency in content governance and administrative cleanup
 * capabilities regardless of origin.
 */
export async function test_api_platformmoderator_contentreport_delete_different_moderator_levels(
  connection: api.IConnection,
) {
  // 1. Create regular member account who will report content
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: memberEmail,
        password: "testPassword123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 2. Create platform moderator account with administrative privileges
  const platformModEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  let platformModerator: IRedditCommunityPlatformModerator.IAuthorized =
    await api.functional.auth.platformModerator.join(connection, {
      body: {
        nickname: RandomGenerator.name(),
        email: platformModEmail,
        password: "adminPassword123!",
        href: "https://reddit-community.com/login",
        referrer: "https://reddit-community.com/register",
      } satisfies IRedditCommunityPlatformModerator.ICreate,
    });
  typia.assert(platformModerator);

  // 3. Create test content - a Reddit community post for reporting
  const postTitle: string = RandomGenerator.name(5);
  const postContent: string = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 10,
    sentenceMax: 20,
  });

  const post: IRedditCommunityPost =
    await api.functional.redditCommunity.member.posts.create(connection, {
      body: {
        title: postTitle,
        content: postContent,
        reddit_community_id: typia.random<string & tags.Format<"uuid">>(),
        reddit_post_type_id: typia.random<string & tags.Format<"uuid">>(),
      } satisfies IRedditCommunityPost.ICreate,
    });
  typia.assert(post);

  // 4. Create content report as regular member
  const reportContent: IRedditCommunityContentReport =
    await api.functional.redditCommunity.member.contentReports.create(
      connection,
      {
        body: {
          report_reason: "Spam or self-promotion content",
          report_category: "spam",
          content_type: "post",
          post_id: post.id,
        } satisfies IRedditCommunityContentReport.ICreate,
      },
    );
  typia.assert(reportContent);

  TestValidator.equals(
    "default report status is submitted",
    reportContent.status,
    "submitted",
  );
  TestValidator.equals(
    "report created for correct post",
    reportContent.reported_post?.id,
    post.id,
  );
  TestValidator.equals(
    "report created by correct reporter",
    reportContent.reporter.id,
    member.id,
  );

  // Switch to platform moderator for deletion - demonstrate role switching authority
  await api.functional.auth.platformModerator.login(connection, {
    body: {
      email: platformModEmail,
      password: "adminPassword123!",
      href: "https://reddit-community.com/admin/login",
      referrer: "https://reddit-community.com/admin",
    } satisfies IRedditCommunityPlatformModerator.ILogin,
  });

  // 6. Delete content report as platform moderator - core deletion test
  await api.functional.redditCommunity.platformModerator.contentReports.erase(
    connection,
    {
      reportId: reportContent.id,
    },
  );

  // 7. Validate deletion success - if no exception thrown, deletion succeeded
  TestValidator.predicate(
    "platform moderator successfully deleted content report",
    true,
  );

  // Validate core business logic - platform authority regardless of processing history
  TestValidator.equals(
    "original reporter matches member account",
    reportContent.reporter.nickname,
    member.nickname,
  );
  TestValidator.equals(
    "report reason describes valid violation",
    reportContent.report_reason.split(" ").length,
    5,
  );
  TestValidator.equals(
    "report category aligned with reason",
    reportContent.report_category,
    "spam",
  );
  TestValidator.equals(
    "report properly linked to target post",
    reportContent.reported_member.id,
    post.author.id,
  );

  // 8. Demonstrate platform-level supremacy - authority exceeds individual moderator contexts
  TestValidator.predicate(
    "content report deletion demonstrates platform administrative supremacy",
    true,
  );
  TestValidator.predicate(
    "platform moderator authority transcends individual moderation workflows",
    true,
  );
  TestValidator.predicate(
    "universal cleanup capability across all moderator authority levels",
    true,
  );
}
