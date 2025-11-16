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

export async function test_api_report_decision_create_escalate(
  connection: api.IConnection,
) {
  // Step 1: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(1),
        password: moderatorPassword,
        href: "https://community.example.com/auth/moderator/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 2: Create member account (reporter)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.name(1),
        password: memberPassword,
        href: "https://community.example.com/auth/member/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Step 3: Create administrator account for setup
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.name(1),
        password: adminPassword,
        name: RandomGenerator.name(),
        href: "https://community.example.com/auth/admin/register",
        referrer: "https://community.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 4: Create category (using admin account)
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Legal & Safety",
          slug: "legal-safety",
          display_order: 1,
          description: "Communities focused on legal and safety matters",
          icon_url: "https://example.com/icons/legal.png",
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 5: Create community (using member account)
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create a post with violation content
  const post: ICommunityPlatformPost =
    await api.functional.communityPlatform.member.posts.create(connection, {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        content_text: RandomGenerator.content({
          paragraphs: 2,
          sentenceMin: 10,
          sentenceMax: 15,
        }),
        is_nsfw: false,
        has_spoiler: false,
      } satisfies ICommunityPlatformPost.ICreate,
    });
  typia.assert(post);

  // Step 7: Generate report ID (in real scenario, report would be created via report API)
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // Step 8: Switch to moderator account for decision creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://community.example.com/auth/moderator/login",
      referrer: "https://community.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 9: Create escalation decision with reason and internal notes
  const decisionReason =
    "Complex violation involving potential legal concerns and safety threats. Requires specialized legal review.";
  const internalNotes =
    "Investigation findings: Pattern detected - similar violations from same user. Requires escalation to legal team for assessment.";

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "escalate",
          reason: decisionReason,
          internal_notes: internalNotes,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 10: Verify escalation decision action type
  TestValidator.equals(
    "decision action type should be escalate",
    decision.action_type,
    "escalate",
  );

  // Step 11: Verify reason meets minimum length requirement
  TestValidator.predicate(
    "decision reason should be at least 10 characters",
    decision.reason.length >= 10,
  );

  // Step 12: Verify reason content
  TestValidator.equals(
    "decision reason matches provided explanation",
    decision.reason,
    decisionReason,
  );

  // Step 13: Verify internal notes are present and match
  TestValidator.equals(
    "decision internal notes contain investigation findings",
    decision.internal_notes,
    internalNotes,
  );

  // Step 14: Verify moderator assignment
  TestValidator.predicate(
    "decision has moderator information",
    decision.moderator !== null && decision.moderator !== undefined,
  );

  TestValidator.equals(
    "decision moderator matches creator",
    decision.moderator.id,
    moderator.id,
  );

  // Step 15: Verify report reference
  TestValidator.predicate(
    "decision has report reference",
    decision.report !== null && decision.report !== undefined,
  );

  TestValidator.equals(
    "decision report ID matches escalated report",
    decision.report.id,
    reportId,
  );

  // Step 16: Verify decision timestamps
  TestValidator.predicate(
    "decision has creation timestamp",
    decision.created_at !== null &&
      decision.created_at !== undefined &&
      decision.created_at.length > 0,
  );

  TestValidator.predicate(
    "decision has update timestamp matching creation",
    decision.updated_at === decision.created_at,
  );

  // Step 17: Verify decision is not deleted
  TestValidator.predicate(
    "escalation decision is active and not deleted",
    decision.deleted_at === null || decision.deleted_at === undefined,
  );

  // Step 18: Verify suspension duration is not set for escalate action
  TestValidator.predicate(
    "escalate action should not have suspension duration",
    decision.suspension_duration_days === null ||
      decision.suspension_duration_days === undefined,
  );
}
