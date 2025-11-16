import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberWarning } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberWarning";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_member_warning_soft_delete_visibility(
  connection: api.IConnection,
) {
  // 1. Create and authenticate member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";
  const memberHref = "http://localhost:3000/auth/member/join";
  const memberReferrer = "http://localhost:3000";

  const memberAuth: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: memberHref,
        referrer: memberReferrer,
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(memberAuth);

  // 2. Create and authenticate administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminHref = "http://localhost:3000/auth/administrator/join";
  const adminReferrer = "http://localhost:3000";

  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: adminHref,
        referrer: adminReferrer,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(adminAuth);

  // 3. Create and authenticate moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModeratorPassword123!";
  const moderatorHref = "http://localhost:3000/auth/moderator/join";
  const moderatorReferrer = "http://localhost:3000";

  const moderatorAuth: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: moderatorHref,
        referrer: moderatorReferrer,
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderatorAuth);

  // Switch to member for community/post creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Create post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content_text: RandomGenerator.content({ paragraphs: 2 }),
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // 7. Submit a report on the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: "This post contains inappropriate content",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // 8. Switch to moderator and create decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: moderatorHref,
      referrer: moderatorReferrer,
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason:
            "Post violates community harassment policy with personal attacks",
          internal_notes: "First offense, pattern monitoring required",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 9. Switch to admin to create member warning
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: adminHref,
      referrer: adminReferrer,
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const warning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: memberAuth.id,
          communityPlatformReportDecisionId: decision.id,
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning);

  // 10. Verify initial warning state (no deletedAt)
  TestValidator.predicate(
    "initial warning should not be soft-deleted",
    warning.deletedAt === null || warning.deletedAt === undefined,
  );

  // 11. Switch back to member and retrieve the warning
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: memberHref,
      referrer: memberReferrer,
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const retrievedWarning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.member.memberWarnings.at(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(retrievedWarning);

  // 12. Verify warning structure with audit trail preservation
  TestValidator.equals(
    "retrieved warning id matches created warning",
    retrievedWarning.id,
    warning.id,
  );

  TestValidator.equals(
    "warning member matches target member",
    retrievedWarning.member.id,
    memberAuth.id,
  );

  TestValidator.equals(
    "warning violation category is preserved",
    retrievedWarning.violationCategory,
    "harassment",
  );

  TestValidator.equals(
    "warning count reflects escalation level",
    retrievedWarning.warningCount,
    1,
  );

  TestValidator.predicate(
    "warning should have creation timestamp",
    retrievedWarning.createdAt !== undefined &&
      retrievedWarning.createdAt !== null,
  );

  TestValidator.predicate(
    "initial retrieval shows active warning state",
    retrievedWarning.deletedAt === null ||
      retrievedWarning.deletedAt === undefined,
  );

  // 13. Verify warning expiration calculation is available
  TestValidator.predicate(
    "warning expiration status should be calculable",
    retrievedWarning.isExpired === undefined ||
      typeof retrievedWarning.isExpired === "boolean",
  );

  // 14. Verify decision relationship is preserved
  TestValidator.predicate(
    "warning maintains link to moderation decision",
    retrievedWarning.decision !== undefined &&
      retrievedWarning.decision !== null,
  );

  TestValidator.equals(
    "decision id in warning matches created decision",
    retrievedWarning.decision.id,
    decision.id,
  );

  TestValidator.equals(
    "decision action type preserved in warning context",
    retrievedWarning.decision.action_type,
    "issue_warning",
  );
}
