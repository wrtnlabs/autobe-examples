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
 * Validates suspension retrieval provides complete audit trail context.
 *
 * Tests that suspension records include comprehensive audit trail information
 * linking disciplinary actions back to the original moderation decisions.
 *
 * Workflow:
 *
 * 1. Create moderator account for managing suspensions
 * 2. Create member account to suspend
 * 3. Create category for community context
 * 4. Create community where violation occurred
 * 5. Create suspension with decision reference
 * 6. Retrieve suspension as moderator
 * 7. Verify suspension includes complete audit trail context
 * 8. Validate all reference fields enable tracing to moderation decision
 */
export async function test_api_moderator_suspension_audit_trail_context(
  connection: api.IConnection,
) {
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const memberPassword = RandomGenerator.alphaNumeric(12);

  // 1. Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(10),
        password: moderatorPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 2. Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphabets(10),
        password: memberPassword,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // Re-authenticate as moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 3. Create administrator and category
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const categorySlug = RandomGenerator.alphabets(8).toLowerCase();
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: categorySlug,
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch to member for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 4. Create community
  const communityIdentifier = RandomGenerator.alphabets(8).toLowerCase();
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: communityIdentifier,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Switch back to moderator for suspension creation
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // 5. Create suspension with decision reference
  const suspensionReason = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 4,
    wordMax: 8,
  });
  const decisionId = typia.random<string & tags.Format<"uuid">>();
  const suspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.create(
      connection,
      {
        body: {
          community_platform_member_id: member.id,
          community_platform_report_decision_id: decisionId,
          suspension_reason: suspensionReason,
          suspended_at: new Date().toISOString(),
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
        } satisfies ICommunityPlatformMemberSuspension.ICreate,
      },
    );
  typia.assert(suspension);

  // 6. Retrieve suspension as moderator
  const retrievedSuspension: ICommunityPlatformMemberSuspension =
    await api.functional.communityPlatform.moderator.memberSuspensions.at(
      connection,
      {
        suspensionId: suspension.id,
      },
    );
  typia.assert(retrievedSuspension);

  // 7. Verify suspension includes complete audit trail context
  TestValidator.equals(
    "suspension ID matches",
    retrievedSuspension.id,
    suspension.id,
  );
  TestValidator.equals(
    "member ID matches",
    retrievedSuspension.community_platform_member_id,
    member.id,
  );
  TestValidator.equals(
    "report decision ID is linked",
    retrievedSuspension.community_platform_report_decision_id,
    decisionId,
  );
  TestValidator.equals(
    "suspension reason matches",
    retrievedSuspension.suspension_reason,
    suspensionReason,
  );

  // 8. Validate audit trail timestamps are present and valid
  TestValidator.predicate(
    "suspended_at timestamp is present",
    retrievedSuspension.suspended_at.length > 0,
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    retrievedSuspension.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is present",
    retrievedSuspension.updated_at.length > 0,
  );
  TestValidator.predicate(
    "expiration timestamp is set",
    retrievedSuspension.expires_at !== null &&
      retrievedSuspension.expires_at !== undefined,
  );

  // Validate complete audit trail linkage
  TestValidator.predicate(
    "suspension provides audit trail context",
    retrievedSuspension.community_platform_member_id === member.id &&
      retrievedSuspension.community_platform_report_decision_id ===
        decisionId &&
      retrievedSuspension.suspension_reason === suspensionReason,
  );
}
