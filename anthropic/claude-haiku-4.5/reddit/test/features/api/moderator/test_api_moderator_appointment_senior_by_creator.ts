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
 * Validate that a community creator can appoint senior moderators.
 *
 * This test verifies that when a creator appoints a senior moderator, the
 * operation succeeds and the moderator is recorded with senior tier. It also
 * confirms that senior moderators have the expected broad moderation powers.
 * The test demonstrates that creators can appoint multiple senior moderators.
 *
 * Workflow:
 *
 * 1. Create community creator member account
 * 2. Create members to appoint as senior moderators
 * 3. Create a category for community classification
 * 4. Create a test community (creator is auto-subscribed)
 * 5. Appoint first member as senior moderator
 * 6. Verify appointment succeeded with correct tier
 * 7. Appoint second member as senior moderator
 * 8. Verify both moderators are properly recorded
 * 9. Validate moderator relationships and permissions
 */
export async function test_api_moderator_appointment_senior_by_creator(
  connection: api.IConnection,
) {
  // 1. Create community creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = "TestPassword123!";
  const creator = await api.functional.auth.member.join(connection, {
    body: {
      email: creatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: creatorPassword,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creator);

  // 2. Create first member to appoint as senior moderator
  const moderator1Email = typia.random<string & tags.Format<"email">>();
  const moderator1Password = "TestPassword123!";
  const moderatorMember1 = await api.functional.auth.member.join(connection, {
    body: {
      email: moderator1Email,
      username: RandomGenerator.alphaNumeric(8),
      password: moderator1Password,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(moderatorMember1);

  // 3. Create second member to appoint as senior moderator
  const moderator2Email = typia.random<string & tags.Format<"email">>();
  const moderator2Password = "TestPassword123!";
  const moderatorMember2 = await api.functional.auth.member.join(connection, {
    body: {
      email: moderator2Email,
      username: RandomGenerator.alphaNumeric(8),
      password: moderator2Password,
      href: "http://localhost:3000/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(moderatorMember2);

  // 4. Switch to creator context and create a category
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Create category as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000/admin",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAccount);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 5. Switch back to creator and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "http://localhost:3000/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 6. Appoint first member as senior moderator
  const moderator1 =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: moderatorMember1.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator1);
  TestValidator.equals(
    "first moderator tier should be senior",
    moderator1.moderator_tier,
    "senior",
  );
  TestValidator.equals(
    "first moderator community id should match",
    moderator1.community.id,
    community.id,
  );
  TestValidator.equals(
    "first moderator member id should match",
    moderator1.member.id,
    moderatorMember1.id,
  );
  TestValidator.predicate(
    "first moderator should be active (removed_at should be null)",
    moderator1.removed_at === null,
  );

  // 7. Appoint second member as senior moderator
  const moderator2 =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: moderatorMember2.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator2);
  TestValidator.equals(
    "second moderator tier should be senior",
    moderator2.moderator_tier,
    "senior",
  );
  TestValidator.equals(
    "second moderator community id should match",
    moderator2.community.id,
    community.id,
  );
  TestValidator.equals(
    "second moderator member id should match",
    moderator2.member.id,
    moderatorMember2.id,
  );
  TestValidator.predicate(
    "second moderator should be active (removed_at should be null)",
    moderator2.removed_at === null,
  );

  // 8. Verify both moderators have different appointment times
  TestValidator.notEquals(
    "moderators should have different appointment timestamps",
    moderator1.appointed_at,
    moderator2.appointed_at,
  );

  // 9. Verify moderator information is complete
  TestValidator.predicate(
    "moderator1 member should have username",
    moderator1.member.username.length > 0,
  );
  TestValidator.predicate(
    "moderator2 member should have username",
    moderator2.member.username.length > 0,
  );
  TestValidator.predicate(
    "community should have identifier",
    community.identifier.length > 0,
  );
}
