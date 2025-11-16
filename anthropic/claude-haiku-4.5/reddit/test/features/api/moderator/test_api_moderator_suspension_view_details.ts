import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformMemberSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMemberSuspension";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test moderator viewing suspension details for moderation oversight.
 *
 * This test validates the complete suspension details retrieval workflow:
 *
 * 1. Creates administrator account for platform management
 * 2. Creates category for community classification
 * 3. Creates moderator account for community oversight
 * 4. Creates member account to be suspended
 * 5. Creates community in the category
 * 6. Creates suspension record via moderation system
 * 7. Retrieves suspension details as moderator
 *
 * Validates that:
 *
 * - Moderator can access suspension information
 * - Suspension details include reason, timeline, and member information
 * - All disciplinary action metadata is accessible for oversight
 */
export async function test_api_moderator_suspension_view_details(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for platform management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for community classification
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: "https://example.com/icon.png",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create moderator account for community oversight
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      username: RandomGenerator.alphabets(8),
      href: "https://example.com/moderator/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(moderator);

  // Step 4: Create member account to be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "https://example.com/member/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 5: Login as member to create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: "https://example.com/member/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          identifier: RandomGenerator.alphabets(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 6: Login as moderator and create suspension record
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "https://example.com/moderator/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const suspensionReportDecisionId = typia.random<
    string & tags.Format<"uuid">
  >();
  const suspensionReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const suspendedAt = new Date().toISOString();
  const expiresAt = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();

  const suspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: suspensionReportDecisionId,
          suspension_reason: suspensionReason,
          suspended_at: suspendedAt,
          expires_at: expiresAt,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 7: Retrieve suspension details as moderator
  const suspensionDetails =
    await api.functional.communityPlatform.moderator.memberSuspensions.at(
      connection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(suspensionDetails);

  // Validate suspension details
  TestValidator.equals(
    "suspension ID matches",
    suspensionDetails.id,
    suspension.id,
  );
  TestValidator.equals(
    "suspended member ID matches",
    suspensionDetails.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "suspension reason matches",
    suspensionDetails.suspension_reason,
    suspensionReason,
  );
  TestValidator.equals(
    "suspension started at",
    suspensionDetails.suspended_at,
    suspendedAt,
  );
  TestValidator.equals(
    "suspension expires at",
    suspensionDetails.expires_at,
    expiresAt,
  );
  TestValidator.predicate(
    "suspension has valid created timestamp",
    suspensionDetails.created_at !== undefined &&
      suspensionDetails.created_at !== null,
  );
  TestValidator.predicate(
    "suspension has valid updated timestamp",
    suspensionDetails.updated_at !== undefined &&
      suspensionDetails.updated_at !== null,
  );
}
