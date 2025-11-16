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
 * Validate moderator appointment authorization enforcement for non-creator
 * members.
 *
 * This test ensures that only authorized users (community creator, senior
 * moderators, and administrators) can appoint moderators. Regular members and
 * junior moderators should receive HTTP 403 Forbidden when attempting to
 * appoint moderators.
 *
 * Test workflow:
 *
 * 1. Create a category for community classification
 * 2. Create community creator member account
 * 3. Create community owned by the creator
 * 4. Create regular member (non-moderator)
 * 5. Create members to be appointed as moderators
 * 6. Attempt moderator appointment by regular member → should fail with 403
 * 7. Verify community creator CAN appoint junior moderator successfully
 * 8. Attempt moderator appointment by junior moderator → should fail with 403
 * 9. Verify creator CAN appoint senior moderator
 * 10. Verify senior moderator CAN appoint additional junior moderators
 */
export async function test_api_moderator_appointment_authorization_non_creator(
  connection: api.IConnection,
) {
  // Step 1: Create a category for community classification
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Technology",
          slug: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "Technology and software communities",
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create community creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "ValidPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creatorMember);

  // Step 3: Create community owned by the creator
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: "Tech Discussion",
          identifier: `tech_${RandomGenerator.alphaNumeric(6)}`,
          description: "A community for technology discussions",
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create regular member (non-moderator)
  const regularEmail = typia.random<string & tags.Format<"email">>();
  const regularMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: regularEmail,
        username: RandomGenerator.alphabets(8),
        password: "ValidPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(regularMember);

  // Step 5: Create members to be appointed as moderators
  const appointeeEmail = typia.random<string & tags.Format<"email">>();
  const appointeeMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: appointeeEmail,
        username: RandomGenerator.alphabets(8),
        password: "ValidPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(appointeeMember);

  const secondAppointeeEmail = typia.random<string & tags.Format<"email">>();
  const secondAppointeeMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: secondAppointeeEmail,
        username: RandomGenerator.alphabets(8),
        password: "ValidPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(secondAppointeeMember);

  const thirdAppointeeEmail = typia.random<string & tags.Format<"email">>();
  const thirdAppointeeMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: thirdAppointeeEmail,
        username: RandomGenerator.alphabets(8),
        password: "ValidPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(thirdAppointeeMember);

  // Step 6: Attempt moderator appointment by regular member → should fail with 403
  await api.functional.auth.member.login(connection, {
    body: {
      email: regularEmail,
      password: "ValidPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  await TestValidator.error(
    "regular member cannot appoint moderator",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: appointeeMember.id,
            tier: "junior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 7: Verify community creator CAN appoint junior moderator successfully
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "ValidPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const juniorModerator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: appointeeMember.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(juniorModerator);
  TestValidator.equals(
    "junior moderator tier is correct",
    juniorModerator.moderator_tier,
    "junior",
  );

  // Step 8: Attempt moderator appointment by junior moderator → should fail with 403
  await api.functional.auth.member.login(connection, {
    body: {
      email: appointeeEmail,
      password: "ValidPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  await TestValidator.error(
    "junior moderator cannot appoint moderator",
    async () => {
      await api.functional.communityPlatform.member.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: secondAppointeeMember.id,
            tier: "junior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 9: Verify creator CAN appoint senior moderator
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "ValidPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const seniorModerator: ICommunityPlatformCommunityModerator =
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
  typia.assert(seniorModerator);
  TestValidator.equals(
    "senior moderator tier is correct",
    seniorModerator.moderator_tier,
    "senior",
  );

  // Step 10: Verify senior moderator CAN appoint additional junior moderators
  await api.functional.auth.member.login(connection, {
    body: {
      email: regularEmail,
      password: "ValidPassword123!",
      href: "https://example.com/login",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const juniorModeratorBySenior: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.member.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: secondAppointeeMember.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(juniorModeratorBySenior);
  TestValidator.equals(
    "junior moderator appointed by senior is correct",
    juniorModeratorBySenior.moderator_tier,
    "junior",
  );
}
