import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_admin_moderator_appointment_fails_already_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "Password123!@",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Create a member account (community creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(10),
        password: "Password123!@",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Step 3: Create a category for community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Create a target member to be appointed as moderator
  const targetMemberEmail = typia.random<string & tags.Format<"email">>();
  const targetMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: targetMemberEmail,
        username: RandomGenerator.alphabets(10),
        password: "Password123!@",
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(targetMember);

  // Step 6: Authenticate as administrator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "Password123!@",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 7: Appoint the target member as a senior moderator (first appointment)
  const firstAppointment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.administrator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: targetMember.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(firstAppointment);
  TestValidator.equals(
    "first appointment should be senior tier",
    firstAppointment.moderator_tier,
    "senior",
  );

  // Step 8: Attempt to appoint the same member as moderator again (should fail)
  await TestValidator.error(
    "duplicate moderator appointment should fail with error",
    async () => {
      await api.functional.communityPlatform.administrator.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: targetMember.id,
            tier: "junior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 9: Verify that the original moderator assignment is still intact
  TestValidator.equals(
    "first appointment member should remain senior moderator",
    firstAppointment.moderator_tier,
    "senior",
  );
  TestValidator.equals(
    "first appointment member ID should match",
    firstAppointment.member.id,
    targetMember.id,
  );
}
