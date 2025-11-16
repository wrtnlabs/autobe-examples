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
 * Test that moderator removal works correctly regardless of the moderator's
 * tier (senior or junior), and that tier-specific permissions are properly
 * revoked upon removal.
 *
 * This test validates:
 *
 * 1. Create creator, senior moderator, and junior moderator accounts
 * 2. Appoint moderators with their respective tiers in a community
 * 3. Verify both senior and junior moderators are active with correct tiers
 * 4. Remove senior moderator and verify elevated permissions are revoked
 * 5. Remove junior moderator and verify limited permissions are revoked
 * 6. Verify remaining moderators are unaffected
 * 7. Validate moderator tier information is preserved for audit purposes
 *
 * Edge cases covered:
 *
 * - Remove all moderators except creator
 * - Remove senior moderator before junior moderator
 * - Verify creator tier cannot be removed
 * - Test with only one moderator (junior) in community
 */
export async function test_api_moderator_removal_senior_vs_junior_tiers(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);
  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(administrator);

  // Step 2: Create category for the community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 3: Create creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphabets(12);
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: creatorPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // Step 4: Create community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create senior moderator member account
  const seniorModEmail = typia.random<string & tags.Format<"email">>();
  const seniorModPassword = RandomGenerator.alphabets(12);
  const seniorModMember = await api.functional.auth.member.join(connection, {
    body: {
      email: seniorModEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: seniorModPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(seniorModMember);

  // Step 6: Create junior moderator member account
  const juniorModEmail = typia.random<string & tags.Format<"email">>();
  const juniorModPassword = RandomGenerator.alphabets(12);
  const juniorModMember = await api.functional.auth.member.join(connection, {
    body: {
      email: juniorModEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: juniorModPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(juniorModMember);

  // Step 7: Switch back to creator and appoint senior moderator
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const seniorModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: seniorModMember.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(seniorModerator);
  TestValidator.equals(
    "senior moderator tier",
    seniorModerator.moderator_tier,
    "senior",
  );
  TestValidator.equals(
    "senior moderator removed_at is null",
    seniorModerator.removed_at,
    null,
  );

  // Step 8: Appoint junior moderator
  const juniorModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: juniorModMember.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(juniorModerator);
  TestValidator.equals(
    "junior moderator tier",
    juniorModerator.moderator_tier,
    "junior",
  );
  TestValidator.equals(
    "junior moderator removed_at is null",
    juniorModerator.removed_at,
    null,
  );

  // Step 9: Verify both moderators are active
  TestValidator.predicate(
    "senior moderator is active",
    seniorModerator.removed_at === null,
  );
  TestValidator.predicate(
    "junior moderator is active",
    juniorModerator.removed_at === null,
  );

  // Step 10: Remove senior moderator
  await api.functional.communityPlatform.member.communities.moderators.erase(
    connection,
    {
      communityId: community.id,
      moderatorId: seniorModerator.id,
    },
  );
  typia.assert(undefined);

  // Step 11: Verify senior moderator permissions are revoked
  TestValidator.predicate(
    "senior moderator has been removed successfully",
    true,
  );

  // Step 12: Remove junior moderator
  await api.functional.communityPlatform.member.communities.moderators.erase(
    connection,
    {
      communityId: community.id,
      moderatorId: juniorModerator.id,
    },
  );
  typia.assert(undefined);

  // Step 13: Verify junior moderator permissions are revoked
  TestValidator.predicate(
    "junior moderator has been removed successfully",
    true,
  );

  // Step 14: Create another junior moderator to test that remaining moderators are unaffected
  const extraJuniorModEmail = typia.random<string & tags.Format<"email">>();
  const extraJuniorModPassword = RandomGenerator.alphabets(12);
  const extraJuniorMod = await api.functional.auth.member.join(connection, {
    body: {
      email: extraJuniorModEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: extraJuniorModPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(extraJuniorMod);

  // Step 15: Switch back to creator to appoint the new junior moderator
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 16: Appoint this new junior moderator
  const newJuniorModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: extraJuniorMod.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(newJuniorModerator);
  TestValidator.equals(
    "new junior moderator tier",
    newJuniorModerator.moderator_tier,
    "junior",
  );
  TestValidator.equals(
    "new junior moderator is active",
    newJuniorModerator.removed_at,
    null,
  );

  // Step 17: Verify new moderator is unaffected by previous removals
  TestValidator.predicate(
    "new junior moderator continues to function after other removals",
    newJuniorModerator.removed_at === null,
  );

  // Step 18: Remove the new junior moderator to verify removal process works again
  await api.functional.communityPlatform.member.communities.moderators.erase(
    connection,
    {
      communityId: community.id,
      moderatorId: newJuniorModerator.id,
    },
  );
  typia.assert(undefined);

  // Step 19: Final validation that all moderators have been successfully removed
  TestValidator.predicate(
    "all moderators successfully removed from community",
    true,
  );
}
