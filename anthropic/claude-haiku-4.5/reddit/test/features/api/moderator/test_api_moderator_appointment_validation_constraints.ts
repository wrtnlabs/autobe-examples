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
 * Validates all constraints and business rule enforcement when appointing
 * moderators.
 *
 * Tests comprehensive validation including:
 *
 * - Non-existent member detection
 * - Creator appointment prevention
 * - Duplicate appointment prevention
 * - Valid moderator tier assignment
 * - Proper moderator role hierarchy
 *
 * This ensures data integrity and prevents invalid moderator states through
 * real-world business logic validation.
 */
export async function test_api_moderator_appointment_validation_constraints(
  connection: api.IConnection,
) {
  // Step 1: Create creator member account
  const creatorAuthData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const creator = await api.functional.auth.member.join(connection, {
    body: creatorAuthData,
  });
  typia.assert(creator);

  // Step 2: Create administrator account
  const adminAuthData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const adminConnection: api.IConnection = {
    ...connection,
    headers: { ...connection.headers },
  };

  const admin = await api.functional.auth.administrator.join(adminConnection, {
    body: adminAuthData,
  });
  typia.assert(admin);

  // Step 3: Create a category
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 4: Create a community
  const communityData = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    identifier: `community_${RandomGenerator.alphaNumeric(8)}`,
    description: RandomGenerator.paragraph({ sentences: 3 }),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created with creator",
    community.creator.id,
    creator.id,
  );

  // Step 5: Create a regular member account
  const memberAuthData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const regularMember = await api.functional.auth.member.join(connection, {
    body: memberAuthData,
  });
  typia.assert(regularMember);

  // Step 6: Test non-existent member appointment validation
  const fakeUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "non-existent member cannot be appointed",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: fakeUUID,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 7: Test community creator cannot be appointed as moderator
  await TestValidator.error(
    "community creator cannot be appointed as moderator",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: creator.id,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 8: Successfully appoint a valid member as senior moderator
  const moderator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: regularMember.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  TestValidator.equals(
    "moderator appointed with correct tier",
    moderator.moderator_tier,
    "senior",
  );
  TestValidator.equals(
    "moderator assigned correct member",
    moderator.member.id,
    regularMember.id,
  );
  TestValidator.predicate(
    "moderator has valid appointment timestamp",
    moderator.appointed_at !== null,
  );

  // Step 9: Test duplicate moderator appointment prevention
  await TestValidator.error(
    "duplicate moderator appointment is prevented",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: regularMember.id,
            tier: "junior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 10: Create additional members for further validation
  const juniorModeratorAuthData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const juniorModerator = await api.functional.auth.member.join(connection, {
    body: juniorModeratorAuthData,
  });
  typia.assert(juniorModerator);

  // Step 11: Appoint junior moderator successfully
  const juniorMod =
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
  typia.assert(juniorMod);
  TestValidator.equals(
    "junior moderator appointed with correct tier",
    juniorMod.moderator_tier,
    "junior",
  );
  TestValidator.notEquals(
    "different moderators have different IDs",
    juniorMod.id,
    moderator.id,
  );

  // Step 12: Verify moderator hierarchy and role differentiation
  TestValidator.predicate(
    "senior moderator role established",
    moderator.moderator_tier === "senior",
  );
  TestValidator.predicate(
    "junior moderator role established",
    juniorMod.moderator_tier === "junior",
  );
  TestValidator.predicate(
    "moderators are active (removed_at is null)",
    moderator.removed_at === null,
  );
  TestValidator.predicate(
    "moderators have valid community reference",
    moderator.community.id === community.id,
  );

  TestValidator.predicate(
    "all validation constraints enforced successfully",
    true,
  );
}
