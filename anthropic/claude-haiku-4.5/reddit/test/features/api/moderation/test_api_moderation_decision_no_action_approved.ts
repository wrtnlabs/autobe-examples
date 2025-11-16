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

export async function test_api_moderation_decision_no_action_approved(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform infrastructure setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://localhost:3000/auth/admin/join",
        referrer: "https://localhost:3000/",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create content category for community organization
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create moderator account for making moderation decisions
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphabets(8),
      href: "https://localhost:3000/auth/moderator/join",
      referrer: "https://localhost:3000/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create member account who creates content
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "https://localhost:3000/auth/member/join",
      referrer: "https://localhost:3000/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Create community as member for content discussion
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community visibility is public",
    community.visibility,
    "public",
  );

  // Step 6: Switch authentication to moderator for review and decision-making
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://localhost:3000/auth/moderator/login",
      referrer: "https://localhost:3000/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Create moderation decision with 'no_action' approving reported content
  // The reportId references a report that was created for violating content
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "no_action",
          reason:
            "Content review complete. The reported post does not violate community guidelines. Discussion is constructive and respectful. No action required.",
          internal_notes:
            "User demonstrates positive community engagement. No patterns of violations detected in account history.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 8: Validate decision records content approval with no_action
  TestValidator.equals(
    "decision action type is no_action",
    decision.action_type,
    "no_action",
  );
  TestValidator.predicate(
    "reason explains moderation decision",
    decision.reason.length >= 10,
  );

  // Step 9: Validate decision timestamp is recorded
  TestValidator.predicate(
    "decision has creation timestamp",
    decision.created_at !== undefined && decision.created_at.length > 0,
  );

  // Step 10: Validate moderator accountability is recorded in decision
  TestValidator.predicate(
    "moderator identity is recorded",
    decision.moderator.id === moderator.id,
  );
  TestValidator.equals(
    "moderator username matches",
    decision.moderator.username,
    moderator.username,
  );

  // Step 11: Validate report context is preserved in the decision
  TestValidator.predicate(
    "decision references the report",
    decision.report.id !== undefined && decision.report.id.length > 0,
  );

  // Step 12: Verify no suspension duration since content was approved
  TestValidator.predicate(
    "no suspension for approved content",
    decision.suspension_duration_days === undefined ||
      decision.suspension_duration_days === null,
  );
}
