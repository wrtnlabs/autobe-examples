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
import type { IRedditCommunityUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserKarma";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";

/**
 * Validates admin deletion of a content report by report ID.
 *
 * Performs a full test scenario covering:
 *
 * - Admin signup and login to obtain credentials
 * - Member signup followed by community and post creation
 * - Member files a content report against the post
 * - Admin deletes the report by ID
 * - Verifies successful deletion and error on repeated deletion
 *
 * All API calls use strict type safety with typia.assert and proper await
 * usage. Authentication roles are switched correctly using login routes.
 */
export async function test_api_content_report_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins to obtain initial tokens
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "P@ssword123";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin logs in again for token refresh and role switching confirmation
  const adminLogin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // 3. Member user joins to create content and reports
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "P@ssword123";
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 4. Member creates a community
  const communityName = RandomGenerator.alphabets(10);
  const communityDescription = RandomGenerator.paragraph({ sentences: 5 });
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name: communityName,
          description: communityDescription,
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Member creates a post in the community
  const postTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 7,
  });
  const postBody = RandomGenerator.content({ paragraphs: 2 });
  const postType = "text";
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          reddit_community_community_id: community.id,
          post_type: postType,
          title: postTitle,
          body_text: postBody,
          author_member_id: member.id,
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  // 6. Member files a content report on the post
  // We need a valid status_id. As it is a required string & uuid format, generate one.
  const reportStatusId = typia.random<string & tags.Format<"uuid">>();
  const reportCategory = "spam"; // Chosen as a valid sample category
  const reportDescription = RandomGenerator.paragraph({ sentences: 3 });

  const reportCreateBody = {
    reporter_guest_id: undefined,
    reporter_member_id: member.id,
    reported_post_id: post.id,
    reported_comment_id: undefined,
    reported_member_id: undefined,
    status_id: reportStatusId,
    category: reportCategory,
    description: reportDescription,
  } satisfies IRedditCommunityReport.ICreate;

  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(report);

  // 7. Admin deletes the report by ID
  await api.functional.redditCommunity.admin.reports.eraseReportById(
    connection,
    { reportId: report.id },
  );

  // 8. Attempt to delete the same report again, expect error
  await TestValidator.error(
    "Deleting the same report twice should fail",
    async () => {
      await api.functional.redditCommunity.admin.reports.eraseReportById(
        connection,
        { reportId: report.id },
      );
    },
  );
}
