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
 * Test that senior moderators can appoint junior moderators to the community.
 *
 * Validates the moderator hierarchy and appointment authority where a community
 * creator appoints a senior moderator, and that senior moderator then appoints
 * a junior moderator. Verifies that the appointment succeeds and the junior
 * moderator appears in the community roster with correct tier designation.
 *
 * Test workflow:
 *
 * 1. Create category for community setup (requires administrator)
 * 2. Create community creator member account
 * 3. Create community with the creator
 * 4. Create second member to be appointed as senior moderator
 * 5. Appoint second member as senior moderator (creator authority)
 * 6. Create third member to be appointed as junior moderator
 * 7. Switch to senior moderator context
 * 8. Appoint third member as junior moderator (senior moderator authority)
 * 9. Validate junior moderator was appointed with correct tier
 */
export async function test_api_moderator_appointment_senior_moderator_authority(
  connection: api.IConnection,
) {
  // Step 1: Create category (requires admin)
  const adminEmail = `admin_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const adminPassword = "AdminPassword123!";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: `admin_${RandomGenerator.alphaNumeric(6)}`,
      name: "Test Admin",
      href: "http://localhost/admin",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Create a category for the community
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

  // Step 2: Create community creator member
  const creatorEmail = `creator_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const creatorPassword = "CreatorPass123!";
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: `creator_${RandomGenerator.alphaNumeric(6)}`,
      password: creatorPassword,
      href: "http://localhost/join",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // Step 3: Create community with creator
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: `Test Community ${RandomGenerator.alphaNumeric(6)}`,
          identifier: `test_${RandomGenerator.alphaNumeric(8)}`,
          description: "A test community for moderator hierarchy testing",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created with correct creator",
    community.creator.id,
    creator.id,
  );

  // Step 4: Create second member to be senior moderator
  const seniorModEmail = `senior_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const seniorModPassword = "SeniorPass123!";
  const seniorModerator = await api.functional.auth.member.join(connection, {
    body: {
      email: seniorModEmail,
      username: `senior_${RandomGenerator.alphaNumeric(6)}`,
      password: seniorModPassword,
      href: "http://localhost/join",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(seniorModerator);

  // Step 5: Appoint senior moderator (creator authority)
  const seniorModeratorAppointment =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: seniorModerator.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(seniorModeratorAppointment);
  TestValidator.equals(
    "senior moderator tier assigned",
    seniorModeratorAppointment.moderator_tier,
    "senior",
  );
  TestValidator.equals(
    "senior moderator assigned correctly",
    seniorModeratorAppointment.member.id,
    seniorModerator.id,
  );
  TestValidator.predicate(
    "senior moderator appointed_at is set",
    seniorModeratorAppointment.appointed_at !== null,
  );
  TestValidator.predicate(
    "senior moderator removed_at is null",
    seniorModeratorAppointment.removed_at === null,
  );

  // Step 6: Create third member to be junior moderator
  const juniorModEmail = `junior_${RandomGenerator.alphaNumeric(8)}@test.com`;
  const juniorModPassword = "JuniorPass123!";
  const juniorModerator = await api.functional.auth.member.join(connection, {
    body: {
      email: juniorModEmail,
      username: `junior_${RandomGenerator.alphaNumeric(6)}`,
      password: juniorModPassword,
      href: "http://localhost/join",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(juniorModerator);

  // Step 7: Switch to senior moderator context via login
  await api.functional.auth.member.login(connection, {
    body: {
      email: seniorModEmail,
      password: seniorModPassword,
      href: "http://localhost/login",
      referrer: "http://localhost/",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 8: Appoint junior moderator (senior moderator authority)
  const juniorModeratorAppointment =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: juniorModerator.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(juniorModeratorAppointment);

  // Step 9: Validate junior moderator appointment
  TestValidator.equals(
    "junior moderator tier assigned",
    juniorModeratorAppointment.moderator_tier,
    "junior",
  );
  TestValidator.equals(
    "junior moderator assigned correctly",
    juniorModeratorAppointment.member.id,
    juniorModerator.id,
  );
  TestValidator.equals(
    "junior moderator community matches",
    juniorModeratorAppointment.community.id,
    community.id,
  );
  TestValidator.predicate(
    "junior moderator appointed_at is set",
    juniorModeratorAppointment.appointed_at !== null,
  );
  TestValidator.predicate(
    "junior moderator removed_at is null",
    juniorModeratorAppointment.removed_at === null,
  );
  TestValidator.predicate(
    "senior moderator tier higher than junior",
    seniorModeratorAppointment.appointed_at <=
      juniorModeratorAppointment.appointed_at,
  );
}
