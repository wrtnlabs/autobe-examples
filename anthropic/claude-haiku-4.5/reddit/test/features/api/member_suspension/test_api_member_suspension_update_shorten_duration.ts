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

/**
 * Test moderator suspension duration reduction through appeal workflow.
 *
 * This test validates that a moderator can successfully shorten a member's
 * suspension duration by updating the expires_at field to an earlier date. This
 * is a common scenario in appeal workflows where moderators partially grant
 * appeals by reducing the suspension period rather than completely reversing
 * the suspension.
 *
 * The test workflow:
 *
 * 1. Create administrator account for system setup
 * 2. Create content category
 * 3. Create member account (will be suspended)
 * 4. Create moderator account (will perform suspension update)
 * 5. Create community
 * 6. Create initial member suspension with future expiration
 * 7. Update suspension with earlier expiration date
 * 8. Verify updated suspension shows earlier expiration
 * 9. Verify updated_at timestamp reflects the change
 */
export async function test_api_member_suspension_update_shorten_duration(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: RandomGenerator.alphaNumeric(12),
      username: `admin_${RandomGenerator.alphaNumeric(8)}`,
      name: RandomGenerator.name(),
      href: "http://localhost:3000/auth/admin",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(8),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (the one to be suspended)
  const memberEmail = `member_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: `member_${RandomGenerator.alphaNumeric(8)}`,
      password: memberPassword,
      href: "http://localhost:3000/auth/member",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 4: Create moderator account
  const moderatorEmail = `moderator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: `moderator_${RandomGenerator.alphaNumeric(8)}`,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 5: Switch to member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "http://localhost:3000/auth/member",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          identifier: RandomGenerator.alphaNumeric(12),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Create initial suspension dates
  const now = new Date();
  const initialExpiresAt = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000); // 7 days from now
  const shortenedExpiresAt = new Date(now.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 days from now

  // Step 7: Switch to moderator to create report decision and suspension
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/moderator",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Create a report decision for the suspension
  const reportId = typia.random<string & tags.Format<"uuid">>();

  const decision =
    await api.functional.communityPlatform.moderator.reports.decision.create(
      connection,
      {
        reportId: reportId,
        body: {
          action_type: "suspend_user",
          reason: "User violated community guidelines regarding harassment",
          suspension_duration_days: 7,
        } satisfies ICommunityPlatformReportDecision.ICreate,
      },
    );
  typia.assert(decision);

  // Step 8: Create initial member suspension
  const suspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decision.id,
          suspension_reason:
            "User violated community guidelines regarding harassment and threats",
          suspended_at: now.toISOString(),
          expires_at: initialExpiresAt.toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Verify initial suspension expires_at is set
  TestValidator.predicate(
    "initial suspension should have expires_at set",
    suspension.expires_at !== null && suspension.expires_at !== undefined,
  );

  // Step 9: Update suspension with earlier expiration date
  const updatedSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.update(
      connection,
      {
        suspensionId: suspension.id,
        body: {
          suspension_reason:
            "User violated community guidelines - appeal partially granted, duration reduced",
          expires_at: shortenedExpiresAt.toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.IUpdate,
      },
    );
  typia.assert(updatedSuspension);

  // Step 10: Verify the suspension was updated correctly
  TestValidator.notEquals(
    "updated suspension expires_at should differ from original",
    updatedSuspension.expires_at,
    suspension.expires_at,
  );

  // Verify the suspension reason was updated
  TestValidator.equals(
    "suspension reason should be updated",
    updatedSuspension.suspension_reason,
    "User violated community guidelines - appeal partially granted, duration reduced",
  );

  // Verify updated_at timestamp is newer than created_at
  const createdTime = new Date(updatedSuspension.created_at).getTime();
  const updatedTime = new Date(updatedSuspension.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should be after or equal to created_at",
    updatedTime >= createdTime,
  );

  // Verify the suspension is still active (deleted_at should be null/undefined)
  TestValidator.predicate(
    "suspension should not be deleted",
    updatedSuspension.deleted_at === null ||
      updatedSuspension.deleted_at === undefined,
  );

  // Verify the member reference is correct
  TestValidator.equals(
    "suspension member_id should match target member",
    updatedSuspension.community_platform_member_id,
    member.id,
  );
}
