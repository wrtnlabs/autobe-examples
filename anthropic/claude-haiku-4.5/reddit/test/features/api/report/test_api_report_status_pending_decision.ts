import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_report_status_pending_decision(
  connection: api.IConnection,
) {
  // 1. Create administrator account for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(2),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
          description: "Technology discussions",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account for community creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "MemberPassword123!",
        href: "https://example.com/member/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech-${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for tech discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Sample Post for Reporting",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 6. Create a report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "misinformation",
        additional_details: "This post contains misleading information",
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);
  TestValidator.equals(
    "report initial status should be submitted",
    report.status,
    "submitted",
  );

  // 7. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: "ModeratorPassword123!",
        href: "https://example.com/moderator/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 8. Update report to assign moderator and transition to in_review
  const reportInReview: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          status: "in_review",
          moderation_assigned_to_id: moderator.id,
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(reportInReview);
  TestValidator.equals(
    "report status should be in_review after assignment",
    reportInReview.status,
    "in_review",
  );

  // 9. Update report to transition to pending_decision status
  const reportPendingDecision: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          status: "pending_decision",
          priority: "high",
          additional_details:
            "Evidence review completed. Case is ready for decision making.",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(reportPendingDecision);
  TestValidator.equals(
    "report status should be pending_decision",
    reportPendingDecision.status,
    "pending_decision",
  );

  // 10. Validate that report correctly reflects investigation stage
  TestValidator.predicate(
    "pending_decision status indicates active investigation phase",
    reportPendingDecision.status === "pending_decision",
  );

  // 11. Verify moderator is assigned to the report
  if (reportPendingDecision.moderation_assigned_to) {
    TestValidator.equals(
      "moderator should still be assigned",
      reportPendingDecision.moderation_assigned_to.id,
      moderator.id,
    );
  }

  // 12. Verify report can transition from pending_decision to resolved
  const reportResolved: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          status: "resolved",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(reportResolved);
  TestValidator.equals(
    "report should transition to resolved status",
    reportResolved.status,
    "resolved",
  );
}
