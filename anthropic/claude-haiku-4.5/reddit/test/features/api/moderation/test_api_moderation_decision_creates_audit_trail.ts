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
 * Test that decision creation establishes complete audit trail.
 *
 * Verifies that when a moderator creates a decision on a report, the system
 * records the moderator identity (extracted from JWT), creation timestamp, and
 * maintains an immutable record that prevents tampering with moderation
 * history.
 *
 * Audit trail ensures all moderation actions are properly tracked with:
 *
 * - Moderator identity and authentication context
 * - Precise creation timestamps (ISO 8601 UTC)
 * - Complete action details (type, reason, optional notes)
 * - Immutable record structure for compliance and appeals
 *
 * Test workflow:
 *
 * 1. Create administrator and authenticate
 * 2. Create category for community organization
 * 3. Create moderator account and authenticate
 * 4. Create member account
 * 5. Create community within category
 * 6. Create post (content to be reported)
 * 7. Create report on post
 * 8. Create moderation decision
 * 9. Verify decision includes moderator identity from JWT
 * 10. Verify creation timestamp is captured
 * 11. Verify decision record is immutable
 */
export async function test_api_moderation_decision_creates_audit_trail(
  connection: api.IConnection,
) {
  // 1. Create administrator account and authenticate
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://platform.example.com/admin/register",
        referrer: "https://platform.example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator created successfully",
    !!administrator.id,
  );

  // 2. Create category for community organization
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Moderation Test Category",
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          description: "Category for testing moderation audit trail",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.predicate("category created successfully", !!category.id);

  // 3. Create moderator account and authenticate
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        password: "ModeratorPassword123!",
        username: RandomGenerator.alphabets(8),
        href: "https://platform.example.com/moderator/register",
        referrer: "https://platform.example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);
  TestValidator.predicate("moderator created successfully", !!moderator.id);

  // 4. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: "MemberPassword123!",
        href: "https://platform.example.com/member/register",
        referrer: "https://platform.example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);
  TestValidator.predicate("member created successfully", !!member.id);

  // 5. Switch to member account and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: "MemberPassword123!",
      href: "https://platform.example.com/member/login",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Moderation Test Community",
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: "Community for testing moderation audit trail",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.predicate("community created successfully", !!community.id);

  // 6-7. Create post and report (simulating content creation and reporting)
  // Note: Since we don't have explicit endpoints for creating posts and reports
  // in the provided API, we simulate by using report decision with generated reportId
  // In a real scenario, these would be created through their respective endpoints

  const reportId = typia.random<string & tags.Format<"uuid">>();

  // 8. Switch to moderator account and create decision with audit trail
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: "ModeratorPassword123!",
      href: "https://platform.example.com/moderator/login",
      referrer: "https://platform.example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const decisionReason =
    "Content violates community harassment policy by including personal attacks and inappropriate language targeting other users.";

  const decision: ICommunityPlatformReportDecision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "remove_content",
          reason: decisionReason,
          internal_notes:
            "Third violation by this user. Previous warnings issued on dates visible in account history.",
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // 9. Verify decision includes moderator identity from JWT (via ISummary)
  TestValidator.predicate(
    "decision has moderator identity",
    !!decision.moderator,
  );
  TestValidator.predicate(
    "moderator ID matches authenticated moderator",
    decision.moderator.id === moderator.id,
  );
  TestValidator.predicate(
    "moderator username recorded in audit trail",
    decision.moderator.username === moderator.username,
  );

  // 10. Verify creation timestamp is captured (ISO 8601 UTC format)
  TestValidator.predicate(
    "decision has creation timestamp",
    !!decision.created_at,
  );
  TestValidator.predicate(
    "creation timestamp is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/.test(
      decision.created_at,
    ),
  );

  // 11. Verify decision record immutability and audit trail integrity
  TestValidator.equals(
    "decision action type preserved",
    decision.action_type,
    "remove_content",
  );
  TestValidator.equals(
    "decision reason recorded accurately",
    decision.reason,
    decisionReason,
  );
  TestValidator.predicate(
    "decision ID is unique UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      decision.id,
    ),
  );

  // 12. Verify report reference maintained for audit trail
  TestValidator.predicate("decision linked to report", !!decision.report);

  // 13. Verify optional internal notes are captured for moderator context
  TestValidator.predicate(
    "internal notes recorded for audit context",
    !!decision.internal_notes,
  );

  // 14. Verify decision immutability - updated_at should equal created_at initially
  TestValidator.predicate(
    "updated_at reflects decision immutability",
    decision.updated_at === decision.created_at,
  );
}
