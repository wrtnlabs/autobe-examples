import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReportAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReportAction";
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
 * Validate that a community moderator user can retrieve a paginated list of
 * moderation actions linked to a specific report.
 *
 * This scenario ensures the report and moderation statuses exist, creates
 * community, post, comment, and report entities, performs role-based
 * authentication switches among member, moderator, and admin actors, and
 * exercises creation and retrieval of moderation actions with filtering,
 * sorting, and pagination.
 *
 * The test validates that only authorized community moderators can access
 * report actions, and verifies correct linkage and data integrity between
 * reports and their moderation actions.
 *
 * The test follows complex real-world permission boundaries and setup, ensuring
 * a robust moderation action listing API.
 */
export async function test_api_report_actions_list_by_report_community_moderator(
  connection: api.IConnection,
) {
  // 1. Community Moderator Signup and authentication
  const communityModeratorEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const communityModerator: IRedditCommunityCommunityModerator.IAuthorized =
    await api.functional.auth.communityModerator.join.joinCommunityModerator(
      connection,
      {
        body: {
          email: communityModeratorEmail,
          password: "Password123!",
        } satisfies IRedditCommunityCommunityModerator.IJoin,
      },
    );
  typia.assert(communityModerator);

  // 2. Admin Signup and authentication
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const admin: IRedditCommunityAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
      } satisfies IRedditCommunityAdmin.ICreate,
    });
  typia.assert(admin);

  // Switch to admin
  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "AdminPass123!",
    } satisfies IRedditCommunityAdmin.ILogin,
  });

  // 3. Create Report Status
  // Using fixed name and description to ensure known status
  const reportStatus: IRedditCommunityReportStatus =
    await api.functional.redditCommunity.admin.reportStatuses.create(
      connection,
      {
        body: {
          name: "pending",
          description: "Report is awaiting review",
        } satisfies IRedditCommunityReportStatus.ICreate,
      },
    );
  typia.assert(reportStatus);

  // 4. Member Signup and authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: IRedditCommunityMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass123!",
      } satisfies IRedditCommunityMember.ICreate,
    });
  typia.assert(member);

  // Switch to member
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPass123!",
    } satisfies IRedditCommunityMember.ILogin,
  });

  // 5. Member creates a community
  const community: IRedditCommunityCommunity =
    await api.functional.redditCommunity.member.communities.createCommunity(
      connection,
      {
        body: {
          name:
            RandomGenerator.name(1).toLowerCase() +
            RandomGenerator.alphaNumeric(4),
          description: RandomGenerator.paragraph({
            sentences: 5,
            wordMin: 4,
            wordMax: 7,
          }),
        } satisfies IRedditCommunityCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Member creates a post in the community
  // Using post_type "text" with body_text
  const post: IRedditCommunityPosts =
    await api.functional.redditCommunity.member.communities.posts.createPost(
      connection,
      {
        communityId: community.id,
        body: {
          reddit_community_community_id: community.id,
          post_type: "text",
          title: RandomGenerator.paragraph({
            sentences: 3,
            wordMin: 5,
            wordMax: 8,
          }).slice(0, 300),
          body_text: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 8,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies IRedditCommunityPosts.ICreate,
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
          body_text: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies IRedditCommunityComment.ICreate,
      },
    );
  typia.assert(comment);

  // 8. Member creates a report about the post
  const report: IRedditCommunityReport =
    await api.functional.redditCommunity.reports.create(connection, {
      body: {
        reporter_member_id: member.id,
        reported_post_id: post.id,
        status_id: reportStatus.id,
        category: "spam",
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditCommunityReport.ICreate,
    });
  typia.assert(report);

  // Switch to communityModerator for moderation actions
  await api.functional.auth.communityModerator.login.loginCommunityModerator(
    connection,
    {
      body: {
        email: communityModeratorEmail,
        password: "Password123!",
      } satisfies IRedditCommunityCommunityModerator.ILogin,
    },
  );

  // 9. CommunityModerator creates moderation actions linked to the report
  // Create multiple actions to test pagination
  const actions: IRedditCommunityReportAction[] = [];
  for (let i = 0; i < 5; i++) {
    const action: IRedditCommunityReportAction =
      await api.functional.redditCommunity.communityModerator.reports.reportActions.create(
        connection,
        {
          reportId: report.id,
          body: {
            report_id: report.id,
            moderator_member_id: communityModerator.id,
            admin_member_id: null,
            action_type: i % 2 === 0 ? "warning" : "deletion",
            notes: `Moderation action number ${i + 1}`,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            deleted_at: null,
          } satisfies IRedditCommunityReportAction.ICreate,
        },
      );
    typia.assert(action);
    actions.push(action);
  }

  // 10. CommunityModerator queries paginated report actions
  const requestBody: IRedditCommunityReportAction.IRequest = {
    page: 1,
    limit: 3,
    sortBy: "created_at",
    order: "desc",
    filterReportId: report.id,
  } satisfies IRedditCommunityReportAction.IRequest;

  const pageResult: IPageIRedditCommunityReportAction =
    await api.functional.redditCommunity.communityModerator.reports.reportActions.searchReportActionsByReportId(
      connection,
      {
        reportId: report.id,
        body: requestBody,
      },
    );
  typia.assert(pageResult);

  // 11. Validate pagination and filter results
  TestValidator.equals(
    "pagination page should be 1",
    pageResult.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 3",
    pageResult.pagination.limit,
    3,
  );

  TestValidator.predicate(
    "all report actions should have the correct report_id",
    pageResult.data.every((action) => action.report_id === report.id),
  );

  TestValidator.predicate(
    "results limited to 3 items",
    pageResult.data.length === 3,
  );

  // Check ordering matches descending created_at
  for (let i = 1; i < pageResult.data.length; i++) {
    TestValidator.predicate(
      `item ${i} created_at >= item ${i + 1} created_at`,
      new Date(pageResult.data[i - 1].created_at).getTime() >=
        new Date(pageResult.data[i].created_at).getTime(),
    );
  }
}
