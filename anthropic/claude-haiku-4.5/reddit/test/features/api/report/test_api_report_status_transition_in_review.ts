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

export async function test_api_report_status_transition_in_review(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPass123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin/register",
        referrer: "http://localhost:3000/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPass123!",
        username: RandomGenerator.alphabets(8),
        href: "http://localhost:3000/moderator/register",
        referrer: "http://localhost:3000/moderator",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 4. Create member account for reporting
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "MemberPass123!",
        username: RandomGenerator.alphabets(8),
        href: "http://localhost:3000/member/register",
        referrer: "http://localhost:3000/member",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 5. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create post in the community
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 7. Create report targeting the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "spam",
        additional_details: RandomGenerator.paragraph({ sentences: 2 }),
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Validate initial report state
  TestValidator.equals("initial report status", report.status, "submitted");
  TestValidator.predicate(
    "initial moderation_assigned_to is null",
    report.moderation_assigned_to === null ||
      report.moderation_assigned_to === undefined,
  );

  // 8. Switch to moderator context
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPass123!",
      href: "http://localhost:3000/moderator/login",
      referrer: "http://localhost:3000/moderator",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 9. Update report status to in_review and assign moderator
  const updatedReport: ICommunityPlatformReport =
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
  typia.assert(updatedReport);

  // 10. Validate status transition
  TestValidator.equals(
    "report status transitioned to in_review",
    updatedReport.status,
    "in_review",
  );

  // 11. Validate moderator assignment
  TestValidator.predicate(
    "moderation_assigned_to is populated",
    updatedReport.moderation_assigned_to !== null &&
      updatedReport.moderation_assigned_to !== undefined,
  );
  typia.assertGuard(updatedReport.moderation_assigned_to!);
  TestValidator.equals(
    "assigned moderator ID matches",
    updatedReport.moderation_assigned_to.id,
    moderator.id,
  );

  // 12. Validate timestamp update
  const reportTimestampAfter = new Date(updatedReport.updated_at);
  const reportTimestampBefore = new Date(report.updated_at);
  TestValidator.predicate(
    "updated_at timestamp is refreshed",
    reportTimestampAfter >= reportTimestampBefore,
  );

  // 13. Validate other fields remain consistent
  TestValidator.equals("report ID remains same", updatedReport.id, report.id);
  TestValidator.equals(
    "report category remains same",
    updatedReport.category,
    report.category,
  );
  TestValidator.equals(
    "reported post remains same",
    updatedReport.reported_post?.id,
    post.id,
  );
}
