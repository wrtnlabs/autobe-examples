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
 * Test moderator retrieving a permanent/indefinite member suspension.
 *
 * Creates moderator and member accounts, establishes community infrastructure,
 * creates a suspension without expiration date (expires_at is null), then
 * retrieves it as moderator. Validates that moderators can identify permanent
 * suspensions distinct from time-limited ones by confirming the null expires_at
 * value is correctly returned.
 *
 * Workflow:
 *
 * 1. Create administrator account
 * 2. Create category for community classification
 * 3. Create member account to be suspended
 * 4. Create moderator account for viewing suspension
 * 5. Create community for suspension context
 * 6. Create indefinite suspension (expires_at: null)
 * 7. Retrieve suspension as moderator
 * 8. Validate null expires_at indicating permanent suspension
 */
export async function test_api_moderator_suspension_view_permanent_indefinite(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 3,
            wordMax: 5,
          }),
          slug: RandomGenerator.alphabets(8),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create member account to be suspended
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const suspendedMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(8),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(suspendedMember);

  // Step 4: Create moderator account for viewing suspension
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(10);
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // Step 5: Authenticate as member and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({
            sentences: 2,
            wordMin: 2,
            wordMax: 5,
          }),
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

  // Step 6: Authenticate as moderator and create indefinite suspension
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  const suspensionReason = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const suspendedAt = new Date().toISOString();
  const reportDecisionId = typia.random<string & tags.Format<"uuid">>();

  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: suspendedMember.id,
          community_platform_report_decision_id: reportDecisionId,
          suspension_reason: suspensionReason,
          suspended_at: suspendedAt,
          expires_at: null,
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // Step 7: Retrieve suspension as moderator
  const retrievedSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.at(
      connection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(retrievedSuspension);

  // Step 8: Validate permanent suspension characteristics
  TestValidator.equals(
    "suspension ID matches",
    retrievedSuspension.id,
    suspension.id,
  );

  TestValidator.equals(
    "suspended member ID matches",
    retrievedSuspension.community_platform_member_id,
    suspendedMember.id,
  );

  TestValidator.equals(
    "report decision ID matches",
    retrievedSuspension.community_platform_report_decision_id,
    reportDecisionId,
  );

  TestValidator.equals(
    "suspension reason preserved",
    retrievedSuspension.suspension_reason,
    suspensionReason,
  );

  TestValidator.equals(
    "suspended_at timestamp matches",
    retrievedSuspension.suspended_at,
    suspendedAt,
  );

  TestValidator.equals(
    "expires_at is null for permanent suspension",
    retrievedSuspension.expires_at,
    null,
  );

  TestValidator.predicate(
    "expires_at is explicitly null indicating indefinite suspension",
    retrievedSuspension.expires_at === null,
  );
}
