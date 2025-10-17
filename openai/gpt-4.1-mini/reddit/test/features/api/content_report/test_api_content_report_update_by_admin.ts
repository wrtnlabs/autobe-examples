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

export async function test_api_content_report_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPass123!";
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Admin login
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 3. Member joins
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "MemberPass123!";
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // 4. Member creates community
  const communityName = `community_${RandomGenerator.alphaNumeric(8)}`;
  const communityDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 7,
  });

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

  // 5. Member creates a post in community
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 15,
  });
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          reddit_community_community_id: community.id,
          post_type: "text",
          title: postTitle.substring(0, 300),
          body_text: postBody.substring(0, 10000),
        } satisfies IRedditCommunityPosts.ICreate,
      },
    );
  typia.assert(post);

  // 6. Member creates a content report for the post
  const reportCategory = "spam";
  const reportDescription = RandomGenerator.paragraph({ sentences: 3 });

  // For status_id in creation, reusing a generated UUID as placeholder
  const initialStatusId = typia.random<string & tags.Format<"uuid">>();

  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: {
        reporter_member_id: member.id,
        reported_post_id: post.id,
        status_id: initialStatusId,
        category: reportCategory,
        description: reportDescription,
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report);

  // 7. Admin updates the content report
  // Generate new data for update
  const newStatusId = typia.random<string & tags.Format<"uuid">>();
  const newCategory = "abuse";
  const newDescription = RandomGenerator.paragraph({ sentences: 4 });

  const updatedReport: IRedditCommunityReport =
    await api.functional.redditCommunity.admin.reports.update(connection, {
      reportId: report.id,
      body: {
        reporter_member_id: member.id,
        reported_post_id: post.id,
        status_id: newStatusId,
        category: newCategory,
        description: newDescription,
      } satisfies IRedditCommunityReport.IUpdate,
    });
  typia.assert(updatedReport);

  // Validate updated values
  TestValidator.equals(
    "status_id should be updated",
    updatedReport.status_id,
    newStatusId,
  );
  TestValidator.equals(
    "category should be updated",
    updatedReport.category,
    newCategory,
  );
  TestValidator.equals(
    "description should be updated",
    updatedReport.description,
    newDescription,
  );
  TestValidator.equals(
    "report id should remain same",
    updatedReport.id,
    report.id,
  );

  // 8. Authorization enforcement - attempt update without admin login should fail
  // Setup unauthorized connection (empty headers)
  const unauthorizedConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.redditCommunity.admin.reports.update(
      unauthorizedConn,
      {
        reportId: report.id,
        body: {
          status_id: newStatusId,
          category: newCategory,
        } satisfies IRedditCommunityReport.IUpdate,
      },
    );
  });

  // 9. Invalid reportId update attempt
  await TestValidator.error(
    "update with invalid reportId should fail",
    async () => {
      await api.functional.redditCommunity.admin.reports.update(connection, {
        reportId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          status_id: newStatusId,
          category: newCategory,
        } satisfies IRedditCommunityReport.IUpdate,
      });
    },
  );
}
