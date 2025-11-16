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

export async function test_api_report_moderator_reassignment(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform setup
  const administratorEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: "https://example.com/auth/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  typia.assertGuard(administrator.account_status === "active");

  // Step 2: Create category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create multiple moderator accounts
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator1Email,
        password: "ModPassword123!",
        username: RandomGenerator.name(1),
        href: "https://example.com/auth/moderator",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator1);

  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderator2Email,
        password: "ModPassword123!",
        username: RandomGenerator.name(1),
        href: "https://example.com/auth/moderator",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator2);

  // Step 4: Create member account for content creation
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: "MemberPassword123!",
        href: "https://example.com/auth/member",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 5: Create community for post
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Technology Discussions",
          identifier: `tech_${RandomGenerator.alphaNumeric(8)}`,
          category_slug: category.slug,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create post for reporting
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Inappropriate Content",
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 7: Create report for the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: "This post contains inappropriate language",
        reporter_contact_email: memberEmail,
        moderation_assigned_to_id: moderator1.id,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Step 8: Validate initial assignment to moderator 1
  TestValidator.equals(
    "report assigned to moderator 1",
    report.moderation_assigned_to?.id,
    moderator1.id,
  );
  const initialTimestamp = report.updated_at;

  // Step 9: Switch to moderator connection and reassign report to moderator 2
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderator2Email,
      password: "ModPassword123!",
      href: "https://example.com/auth/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Update report to reassign to moderator 2
  const updatedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          moderation_assigned_to_id: moderator2.id,
          status: "in_review",
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(updatedReport);

  // Step 10: Validate reassignment was successful
  TestValidator.equals(
    "report reassigned to moderator 2",
    updatedReport.moderation_assigned_to?.id,
    moderator2.id,
  );

  // Step 11: Validate updated_at timestamp changed
  TestValidator.predicate(
    "updated_at timestamp reflects reassignment",
    () => new Date(updatedReport.updated_at) > new Date(initialTimestamp),
  );

  // Step 12: Validate report status changed to in_review
  TestValidator.equals(
    "report status is in_review",
    updatedReport.status,
    "in_review",
  );

  // Step 13: Test clearing assignment by setting to null
  const clearedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          moderation_assigned_to_id: null,
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(clearedReport);

  // Step 14: Validate assignment was cleared
  TestValidator.equals(
    "report assignment cleared",
    clearedReport.moderation_assigned_to,
    null,
  );

  // Step 15: Self-assignment test - moderator assigns to themselves
  const selfAssignedReport: ICommunityPlatformReport =
    await api.functional.communityPlatform.moderator.reports.update(
      connection,
      {
        reportId: report.id,
        body: {
          moderation_assigned_to_id: moderator2.id,
        } satisfies ICommunityPlatformReport.IUpdate,
      },
    );
  typia.assert(selfAssignedReport);

  TestValidator.equals(
    "report self-assigned to moderator 2",
    selfAssignedReport.moderation_assigned_to?.id,
    moderator2.id,
  );
}
