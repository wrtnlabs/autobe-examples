import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentVote";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunitySubscription";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunityPosts } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPosts";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportAction";
import type { IRedditCommunityReportStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReportStatus";
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Validate that an admin user can update a content moderation report
 * successfully.
 *
 * This E2E test performs the full lifecycle that includes:
 *
 * 1. Admin user registration and login for authentication.
 * 2. Member user registration and login to create content and submit reports.
 * 3. Member creates a community.
 * 4. Member creates a post within that community.
 * 5. Member creates a comment on the post.
 * 6. Admin user creates a report status entry.
 * 7. Member user submits a content report referencing the post.
 * 8. Admin user updates the report's status and description.
 *
 * The test checks for correct authentication, authorization, proper data
 * population, and successful request-response integrity through typia.assert
 * validations.
 *
 * This validates that admin users have permission and capability to update
 * report entries governing the moderation lifecycle.
 */
export async function test_api_content_report_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user registers
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "TestPassword!23";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin user logs in
  const adminLogin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Member user registers
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPassword!23";
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 4. Member user logs in
  const memberLogin: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ILogin,
    });
  typia.assert(memberLogin);

  // 5. Member creates a community
  const community =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 8,
          })
            .replace(/\s+/g, "_")
            .toLowerCase(),
          description: RandomGenerator.content({ paragraphs: 1 }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate(
    "community id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      community.id,
    ),
  );

  // 6. Member creates a post within the community
  const postTypeChoices = ["text", "link", "image"] as const;
  const postType = RandomGenerator.pick(postTypeChoices);

  const postBody = {
    reddit_community_community_id: community.id,
    post_type: postType,
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 3, wordMax: 8 }),
    body_text: null as string | null,
    link_url: null as string | null,
    image_url: null as string | null,
  } satisfies IRedditCommunityPosts.ICreate;

  // Populate according to post_type
  if (postType === "text")
    postBody.body_text = RandomGenerator.content({ paragraphs: 1 });
  else if (postType === "link")
    postBody.link_url = `https://example.com/${RandomGenerator.alphaNumeric(8)}`;
  else if (postType === "image")
    postBody.image_url = `https://example.com/image/${RandomGenerator.alphaNumeric(6)}.jpg`;

  const post =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);

  // 7. Member creates a comment on the post
  const comment: IRedditCommunityComment =
    await api.functional.redditCommunity.member.posts.comments.create(
      connection,
      {
        postId: post.id,
        body: {
          reddit_community_post_id: post.id,
          body_text: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // 8. Admin creates a report status
  const reportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: {
          name: `status_${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 1 }),
        } satisfies IRedditCommunityReportStatus.ICreate,
      },
    );
  typia.assert(reportStatus);

  // 9. Member user creates a content report referencing the post
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: {
        reporter_member_id: memberLogin.id,
        reported_post_id: post.id,
        status_id: reportStatus.id,
        category: "spam",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report);

  // 10. Admin updates the report (status and description updated)
  const updatedDescription = RandomGenerator.paragraph({ sentences: 4 });
  const updatedStatus = reportStatus.id; // For simplicity reuse same status

  const updatedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.admin.reports.update(connection, {
      reportId: report.id,
      body: {
        reporter_guest_id: null,
        reporter_member_id: memberLogin.id,
        reported_post_id: post.id,
        reported_comment_id: null,
        reported_member_id: null,
        status_id: updatedStatus,
        category: report.category,
        description: updatedDescription,
      } satisfies IRedditCommunityReport.IUpdate,
    });
  typia.assert(updatedReport);

  // 11. Validate updated report properties
  TestValidator.equals(
    "updated report id should match original",
    updatedReport.id,
    report.id,
  );

  TestValidator.equals(
    "updated report status should be new status",
    updatedReport.status_id,
    updatedStatus,
  );

  TestValidator.equals(
    "updated report description should be new description",
    updatedReport.description,
    updatedDescription,
  );
}
