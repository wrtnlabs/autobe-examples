import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportDecision";

export async function test_api_member_suspension_comprehensive_audit_trail(
  connection: api.IConnection,
) {
  // Setup: Create multiple actors (administrator, moderator, member)
  // 1. Create administrator account
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: `admin_${RandomGenerator.alphaNumeric(8)}@test.com`,
        password: adminPassword,
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: RandomGenerator.name(),
        href: "https://example.com/auth/admin",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // 2. Create category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(5)}`,
          slug: `category-${RandomGenerator.alphaNumeric(5)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create moderator account
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: `moderator_${RandomGenerator.alphaNumeric(6)}`,
      href: "https://example.com/auth/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // 4. Create member account (who will be suspended)
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(6)}`,
      password: memberPassword,
      href: "https://example.com/auth/member",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 5. Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(8)}`,
          identifier: `comm_${RandomGenerator.alphaNumeric(8)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Switch to moderator context to create a decision
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/auth/moderator",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create a report decision (simulating a moderation decision)
  const reportId = typia.random<string & tags.Format<"uuid">>();
  const suspensionDurationDays = 7;

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason:
            "Violation of community harassment policy with persistent behavior pattern over multiple incidents",
          internal_notes:
            "User has prior warning for similar violations, third incident in 30 days",
          suspension_duration_days: suspensionDurationDays,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Validate decision structure for audit trail
  TestValidator.equals(
    "decision action type",
    decision.action_type,
    "suspend_user",
  );
  TestValidator.predicate(
    "decision reason minimum length",
    () => decision.reason.length >= 10,
  );
  TestValidator.equals(
    "decision moderator id",
    decision.moderator.id,
    moderator.id,
  );
  TestValidator.predicate(
    "decision created_at timestamp",
    () => decision.created_at !== null,
  );
  TestValidator.equals(
    "decision timestamps match initially",
    decision.created_at,
    decision.updated_at,
  );
  TestValidator.equals(
    "decision deleted_at null for active",
    decision.deleted_at,
    null,
  );

  // Create the member suspension using the decision
  const suspensionStartTime = new Date();
  const suspensionExpiryTime = new Date(
    suspensionStartTime.getTime() +
      suspensionDurationDays * 24 * 60 * 60 * 1000,
  );

  const suspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason:
            "User engaged in persistent harassment and threats toward community members with multiple prior warnings",
          suspended_at: suspensionStartTime.toISOString(),
          expires_at: suspensionExpiryTime.toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Validate core audit trail links
  TestValidator.equals(
    "suspension member_id matches",
    suspension.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension decision_id matches",
    suspension.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.equals(
    "suspension reason immutable",
    suspension.suspension_reason,
    "User engaged in persistent harassment and threats toward community members with multiple prior warnings",
  );
  TestValidator.equals(
    "suspension start timestamp",
    suspension.suspended_at,
    suspensionStartTime.toISOString(),
  );
  TestValidator.equals(
    "suspension expiry timestamp",
    suspension.expires_at,
    suspensionExpiryTime.toISOString(),
  );

  // Validate timestamp fields
  TestValidator.predicate(
    "created_at is present",
    () => suspension.created_at !== null && suspension.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is present",
    () => suspension.updated_at !== null && suspension.updated_at !== undefined,
  );
  TestValidator.equals(
    "deleted_at null for active",
    suspension.deleted_at,
    null,
  );

  // Validate temporal consistency
  const createdTime = new Date(suspension.created_at);
  const updatedTime = new Date(suspension.updated_at);
  TestValidator.predicate(
    "updated_at gte created_at",
    () => updatedTime.getTime() >= createdTime.getTime(),
  );

  // Validate audit chain integrity
  TestValidator.predicate("moderator id is uuid", () =>
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      decision.moderator.id,
    ),
  );
  TestValidator.predicate(
    "report reference exists",
    () => decision.report !== null && decision.report !== undefined,
  );
  TestValidator.equals(
    "suspension links to decision",
    suspension.community_platform_report_decision_id,
    decision.id,
  );
  TestValidator.predicate(
    "moderator username present",
    () =>
      decision.moderator.username !== null &&
      decision.moderator.username.length > 0,
  );

  // Validate field immutability
  TestValidator.equals(
    "member_id immutable",
    suspension.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "decision_id immutable",
    suspension.community_platform_report_decision_id,
    decision.id,
  );

  // Validate suspension duration calculation
  const expiryDate = suspension.expires_at
    ? new Date(suspension.expires_at)
    : null;
  if (expiryDate !== null) {
    const startDate = new Date(suspension.suspended_at);
    const durationMs = expiryDate.getTime() - startDate.getTime();
    const durationDays = durationMs / (24 * 60 * 60 * 1000);
    TestValidator.predicate(
      "duration matches decision",
      () => Math.abs(durationDays - suspensionDurationDays) < 0.01,
    );
  }

  // Validate timestamp formats
  TestValidator.predicate("created_at iso format", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.created_at),
  );
  TestValidator.predicate("updated_at iso format", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.updated_at),
  );
  TestValidator.predicate("suspended_at iso format", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.suspended_at),
  );
  TestValidator.predicate(
    "expires_at iso format",
    () =>
      !suspension.expires_at ||
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(suspension.expires_at),
  );
}
