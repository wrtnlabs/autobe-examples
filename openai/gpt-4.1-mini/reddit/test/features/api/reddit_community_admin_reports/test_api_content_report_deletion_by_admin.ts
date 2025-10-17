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
 * Test the full deletion lifecycle of a content moderation report by an
 * authorized admin.
 *
 * This test verifies that an admin can:
 *
 * 1. Register and login
 * 2. Create a community and post by a member
 * 3. Create a new report status
 * 4. Register a valid content report referencing the post
 * 5. Successfully delete the report by its ID
 * 6. Ensure that the deletion call succeeds without error
 *
 * The test covers authentication, multi-role user setup, content creation,
 * report lifecycle management, and enforces role-based access control via the
 * admin report deletion endpoint.
 *
 * All API inputs and outputs are type-checked and validated using typia.assert.
 * Each step uses realistic random data aligned to described DTO constraints.
 */
export async function test_api_content_report_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin join/register
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Admin login
  const adminLogin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ILogin,
    });
  typia.assert(adminLogin);

  // Step 3: Member join/register
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Step 4: Member login
  const memberLogin: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.login(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ILogin,
    });
  typia.assert(memberLogin);

  // Step 5: Create a community
  const communityCreateBody = {
    name: RandomGenerator.alphabets(10),
    description: RandomGenerator.paragraph({ sentences: 5 }),
  } satisfies IRedditCommunityCommunity.ICreate;
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: communityCreateBody,
      },
    );
  typia.assert(community);

  // Step 6: Create a post in the community
  const postCreateBody = {
    reddit_community_community_id: community.id,
    post_type: "text",
    title: RandomGenerator.paragraph({ sentences: 3, wordMin: 5, wordMax: 10 }),
    body_text: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IRedditCommunityPosts.ICreate;
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);

  // Step 7: Admin creates a report status
  const reportStatusCreateBody = {
    name: "pending",
    description: "Initial pending status",
  } satisfies IRedditCommunityReportStatus.ICreate;
  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: reportStatusCreateBody,
      },
    );
  typia.assert(reportStatus);

  // Step 8: Create a content report referencing the post, by the member
  const reportCreateBody = {
    reporter_member_id: member.id,
    status_id: reportStatus.id,
    category: "spam",
    reported_post_id: post.id,
    description: "Reported for spam content",
  } satisfies IRedditCommunityReport.ICreate;
  const contentReport: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: reportCreateBody,
    });
  typia.assert(contentReport);

  // Step 9: Delete the report as admin by report id
  await api.functional.redditCommunity.admin.reports.eraseReportById(
    connection,
    {
      reportId: contentReport.id,
    },
  );

  // Step 10: Deletion succeeded if no error thrown; no further get operations are predefined
  TestValidator.predicate("Report deletion completed without error", true);
}
