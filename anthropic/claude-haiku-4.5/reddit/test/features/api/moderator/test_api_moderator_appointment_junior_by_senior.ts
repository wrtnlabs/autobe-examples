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
 * Test that senior moderators can appoint junior moderators.
 *
 * This test validates the moderator appointment workflow including:
 *
 * 1. Creating member accounts with different roles
 * 2. Creating a community and assigning moderators
 * 3. Verifying that senior moderators can appoint junior moderators
 * 4. Validating tier restrictions and authorization boundaries
 * 5. Ensuring only creators and senior moderators can perform appointments
 */
export async function test_api_moderator_appointment_junior_by_senior(
  connection: api.IConnection,
) {
  // Step 1: Create community creator member
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorPassword = RandomGenerator.alphaNumeric(12);
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: creatorPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);
  TestValidator.equals("creator member created", typeof creator.id, "string");

  // Step 2: Create senior moderator candidate member
  const seniorModEmail = typia.random<string & tags.Format<"email">>();
  const seniorModPassword = RandomGenerator.alphaNumeric(12);
  const seniorModCandidate: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: seniorModEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: seniorModPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(seniorModCandidate);

  // Step 3: Create junior moderator candidate member
  const juniorModEmail = typia.random<string & tags.Format<"email">>();
  const juniorModPassword = RandomGenerator.alphaNumeric(12);
  const juniorModCandidate: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: juniorModEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: juniorModPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(juniorModCandidate);

  // Step 4: Create administrator to create category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 5: Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(),
          slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);
  TestValidator.equals("category created", typeof category.id, "string");

  // Step 6: Login as creator and create community
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: creatorPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals("community created", typeof community.id, "string");

  // Step 7: Creator appoints senior moderator
  const seniorModeratorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: seniorModCandidate.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(seniorModeratorAssignment);
  TestValidator.equals(
    "senior moderator tier assigned",
    seniorModeratorAssignment.moderator_tier,
    "senior",
  );

  // Step 8: Login as senior moderator
  await api.functional.auth.member.login(connection, {
    body: {
      email: seniorModEmail,
      password: seniorModPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 9: Senior moderator appoints junior moderator
  const juniorModeratorAssignment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: juniorModCandidate.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(juniorModeratorAssignment);
  TestValidator.equals(
    "junior moderator appointed by senior",
    juniorModeratorAssignment.moderator_tier,
    "junior",
  );
  TestValidator.equals(
    "junior moderator member id matches",
    juniorModeratorAssignment.member.id,
    juniorModCandidate.id,
  );

  // Step 10: Create another member for testing junior moderator permissions
  const anotherMemberEmail = typia.random<string & tags.Format<"email">>();
  const anotherMemberPassword = RandomGenerator.alphaNumeric(12);
  const anotherMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: anotherMemberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: anotherMemberPassword,
        href: "https://example.com/register",
        referrer: "https://example.com",
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(anotherMember);

  // Step 11: Login as junior moderator
  await api.functional.auth.member.login(connection, {
    body: {
      email: juniorModEmail,
      password: juniorModPassword,
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 12: Junior moderator should not be able to appoint moderators
  await TestValidator.error(
    "junior moderator cannot appoint moderators",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: anotherMember.id,
            tier: "junior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );
}
