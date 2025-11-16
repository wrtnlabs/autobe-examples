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

/**
 * Tests moderation decision escalation workflow for complex cases.
 *
 * Validates the escalation process where a moderator reviews a content
 * violation report and determines that the case requires higher authority
 * review due to legal or executive implications. This test ensures:
 *
 * 1. Multi-actor authentication (member, moderator, administrator)
 * 2. Community and category infrastructure setup
 * 3. Escalation decision creation with proper documentation
 * 4. Escalation reason recording in audit trail
 */
export async function test_api_moderation_decision_escalate_to_higher_authority(
  connection: api.IConnection,
) {
  // Step 1: Create administrator and initialize categories
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.name(1),
      name: RandomGenerator.name(2),
      href: "https://community.example.com/auth/register",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);
  TestValidator.equals("admin account created", typeof admin.id, "string");

  // Step 2: Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Tech discussions and topics",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals("category created", typeof category.id, "string");

  // Step 3: Create member (community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.name(1),
      password: memberPassword,
      href: "https://community.example.com/register",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);
  TestValidator.equals("member account created", typeof member.id, "string");

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion Forum",
          identifier: `tech_forum_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community created", typeof community.id, "string");

  // Step 5: Create moderator for content review
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.name(1),
      password: moderatorPassword,
      href: "https://community.example.com/moderator/register",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator account created",
    typeof moderator.id,
    "string",
  );

  // Step 6: Authenticate as moderator
  const moderatorAuth = await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/moderator/login",
      referrer: "https://community.example.com/",
    } satisfies ICommunityPlatformModerator.ILogin,
  });
  typia.assert(moderatorAuth);
  TestValidator.equals(
    "moderator authenticated",
    typeof moderatorAuth.id,
    "string",
  );

  // Step 7: Create a test report ID for escalation decision
  // In production, this report would exist from actual violation reports
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 8: Create escalation decision
  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "escalate",
          reason:
            "This case involves potential legal implications regarding intellectual property infringement and requires executive review for appropriate action. The reported content appears to violate multiple policies simultaneously, necessitating higher authority decision-making.",
          internal_notes:
            "Complex case involving IP concerns, multiple violations, and potential legal exposure. Recommend executive review within 48 hours.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 9: Validate escalation decision
  TestValidator.equals("decision ID exists", typeof decision.id, "string");
  TestValidator.equals(
    "action type is escalate",
    decision.action_type,
    "escalate",
  );
  TestValidator.predicate(
    "reason explains escalation with sufficient detail",
    decision.reason.length >= 10,
  );
  TestValidator.predicate(
    "reason mentions higher authority or legal concerns",
    decision.reason.toLowerCase().includes("executive") ||
      decision.reason.toLowerCase().includes("higher") ||
      decision.reason.toLowerCase().includes("legal"),
  );
  TestValidator.equals(
    "moderator information captured in decision",
    typeof decision.moderator.id,
    "string",
  );

  // Step 10: Verify escalation is recorded with timestamp
  TestValidator.equals(
    "escalation timestamp recorded",
    typeof decision.created_at,
    "string",
  );
  TestValidator.predicate("escalation timestamp is valid ISO 8601", () => {
    const date = new Date(decision.created_at);
    return !isNaN(date.getTime());
  });

  // Step 11: Verify report reference in decision
  TestValidator.equals(
    "report reference is included in decision",
    typeof decision.report.id,
    "string",
  );
}
