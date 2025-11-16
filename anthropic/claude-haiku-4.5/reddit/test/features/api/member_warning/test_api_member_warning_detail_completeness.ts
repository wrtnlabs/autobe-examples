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

export async function test_api_member_warning_detail_completeness(
  connection: api.IConnection,
) {
  // Step 1: Set up authentication actors with stored credentials
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPass123!" + RandomGenerator.alphaNumeric(6);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: "https://community.example.com/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  const moderatorEmail: string = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "TestPass123!" + RandomGenerator.alphaNumeric(6);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://community.example.com/moderator-register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  const administratorEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const administratorPassword =
    "TestPass123!" + RandomGenerator.alphaNumeric(6);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: administratorEmail,
        username: RandomGenerator.alphabets(8),
        password: administratorPassword,
        name: RandomGenerator.name(),
        href: "https://community.example.com/admin-register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Switch to administrator for category creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
      href: "https://community.example.com/admin-login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 2: Create category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: "technology-" + RandomGenerator.alphaNumeric(6),
          description: "Technology discussion and news",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://community.example.com/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 3: Create community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: "tech-" + RandomGenerator.alphaNumeric(6),
          description: "A place to discuss technology",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create a post
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: "Controversial Post",
        content_text: "This is a post with inappropriate content",
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 5: Create a report about the post
  const report: ICommunityPlatformReport =
    await api.functional.communityPlatform.member.reports.create(connection, {
      body: {
        reported_post_id: post.id,
        category: "harassment",
        additional_details: "This post violates community standards",
        reporter_contact_email: memberEmail,
      } satisfies ICommunityPlatformReport.ICreate,
    });
  typia.assert(report);

  // Switch to moderator for decision creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/moderator-login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Create moderation decision with warning action
  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: report.id,
        body: {
          action_type: "issue_warning",
          reason:
            "Post violates community harassment policy with targeted personal attacks",
          internal_notes:
            "First warning for this member. Monitor for repeat violations.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Switch to administrator for warning creation
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: administratorEmail,
      password: administratorPassword,
      href: "https://community.example.com/admin-login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 7: Create member warning record
  const warning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.administrator.memberWarnings.create(
      connection,
      {
        body: {
          communityPlatformMemberId: member.id,
          communityPlatformReportDecisionId: decision.id,
          violationCategory: "harassment",
          warningCount: 1,
        } satisfies ICommunityPlatformMemberWarning.ICreate,
      },
    );
  typia.assert(warning);

  // Switch back to member to retrieve warning
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://community.example.com/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 8: Retrieve warning detail and validate completeness
  const retrievedWarning: ICommunityPlatformMemberWarning =
    await api.functional.communityPlatform.member.memberWarnings.at(
      connection,
      {
        warningId: warning.id,
      },
    );
  typia.assert(retrievedWarning);

  // Validate warning completeness
  TestValidator.equals(
    "warning ID matches created warning",
    retrievedWarning.id,
    warning.id,
  );

  TestValidator.equals(
    "member ID is populated in warning",
    retrievedWarning.member.id,
    member.id,
  );

  TestValidator.equals(
    "violation category is correctly recorded",
    retrievedWarning.violationCategory,
    "harassment",
  );

  TestValidator.equals(
    "warning count reflects escalation level",
    retrievedWarning.warningCount,
    1,
  );

  TestValidator.predicate(
    "creation timestamp is set and valid",
    retrievedWarning.createdAt !== null &&
      retrievedWarning.createdAt !== undefined &&
      retrievedWarning.createdAt.length > 0,
  );

  TestValidator.predicate(
    "update timestamp is set and valid",
    retrievedWarning.updatedAt !== null &&
      retrievedWarning.updatedAt !== undefined &&
      retrievedWarning.updatedAt.length > 0,
  );

  TestValidator.predicate(
    "decision is linked and contains complete information",
    retrievedWarning.decision !== null &&
      retrievedWarning.decision !== undefined,
  );

  if (retrievedWarning.decision) {
    TestValidator.equals(
      "decision ID matches the created decision",
      retrievedWarning.decision.id,
      decision.id,
    );

    TestValidator.equals(
      "decision action type is warning",
      retrievedWarning.decision.action_type,
      "issue_warning",
    );

    TestValidator.predicate(
      "moderator reasoning is included in decision",
      retrievedWarning.decision.reason.length >= 10,
    );

    TestValidator.equals(
      "moderator identity is captured in decision",
      retrievedWarning.decision.moderator.id,
      moderator.id,
    );
  }

  TestValidator.predicate(
    "expiration status is computed",
    typeof retrievedWarning.isExpired === "boolean",
  );

  TestValidator.predicate(
    "days remaining field reflects warning expiration window",
    retrievedWarning.daysRemaining === null ||
      retrievedWarning.daysRemaining === undefined ||
      (typeof retrievedWarning.daysRemaining === "number" &&
        retrievedWarning.daysRemaining >= 0),
  );

  TestValidator.predicate(
    "soft delete timestamp is null for active warning",
    retrievedWarning.deletedAt === null ||
      retrievedWarning.deletedAt === undefined,
  );
}
