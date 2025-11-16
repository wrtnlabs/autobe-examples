import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate moderator appointment with tier validation and correct tier
 * recording.
 *
 * This test validates the moderator appointment endpoint with tier handling. It
 * verifies that both 'senior' and 'junior' tier values are accepted and
 * correctly recorded in the appointment response.
 *
 * Test workflow:
 *
 * 1. Create a community creator member account
 * 2. Create a category for the community
 * 3. Create a community with the creator as initial moderator
 * 4. Create a member to be appointed as 'senior' moderator
 * 5. Appoint the first member as 'senior' moderator and verify tier is recorded
 * 6. Create another member to be appointed as 'junior' moderator
 * 7. Appoint the second member as 'junior' moderator and verify tier is recorded
 */
export async function test_api_moderator_appointment_tier_change_validation(
  connection: api.IConnection,
) {
  // 1. Create community creator member
  const creatorEmail = `creator_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: `creator_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        href: "http://localhost/join",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);
  TestValidator.equals("creator account created", creator.id !== null, true);

  // 2. Create a category
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: `admin_${RandomGenerator.alphaNumeric(6)}`,
        name: "Test Admin",
        href: "http://localhost/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: `Category_${RandomGenerator.alphaNumeric(6)}`,
          slug: `category-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to creator for community creation
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 3. Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Community_${RandomGenerator.alphaNumeric(6)}`,
          identifier: `community_${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community created", community.id !== null, true);

  // 4. Create first member to appoint as 'senior' moderator
  const member1Email = `member1_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member1: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member1Email,
        username: `member1_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        href: "http://localhost/join",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member1);

  // Switch back to creator for moderator appointments
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 5. Test appointment with 'senior' tier - should succeed and record tier correctly
  const seniorModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: member1.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(seniorModerator);
  TestValidator.equals(
    "senior tier correctly recorded",
    seniorModerator.moderator_tier,
    "senior",
  );
  TestValidator.equals(
    "senior moderator member matches",
    seniorModerator.member.id,
    member1.id,
  );

  // 6. Create second member and test appointment with 'junior' tier
  const member2Email = `member2_${RandomGenerator.alphaNumeric(8)}@example.com`;
  const member2: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: member2Email,
        username: `member2_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        href: "http://localhost/join",
        referrer: "http://localhost",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member2);

  // Switch back to creator
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      href: "http://localhost/login",
      referrer: "http://localhost",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // 7. Test appointment with 'junior' tier - should succeed and record tier correctly
  const juniorModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: member2.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(juniorModerator);
  TestValidator.equals(
    "junior tier correctly recorded",
    juniorModerator.moderator_tier,
    "junior",
  );
  TestValidator.equals(
    "junior moderator member matches",
    juniorModerator.member.id,
    member2.id,
  );
}
