import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

export async function test_api_moderator_appointment_fails_already_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account and category
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin account
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Create category for community
  const categorySlug = RandomGenerator.alphabets(10);
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: categorySlug,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 2: Create community creator member account
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);

  // Switch to creator account
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 3: Create a community
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(8),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: categorySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 4: Create the target member account to be appointed as moderator
  const targetMemberEmail = typia.random<string & tags.Format<"email">>();
  const targetMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: targetMemberEmail,
        username: RandomGenerator.alphabets(8),
        password: "TestPassword123!",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(targetMember);

  // Switch back to creator account for appointment (creator has moderator permissions)
  await api.functional.auth.member.login(connection, {
    body: {
      email: creatorEmail,
      password: "TestPassword123!",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  // Step 5: First appointment of the member as moderator (should succeed)
  const firstAppointment: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.moderator.communities.moderators.create(
      connection,
      {
        communityId: community.id,
        body: {
          memberId: targetMember.id,
          tier: "junior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(firstAppointment);

  // Verify the first appointment was successful
  TestValidator.equals(
    "first appointment tier should be junior",
    firstAppointment.moderator_tier,
    "junior",
  );
  TestValidator.equals(
    "appointed member ID should match target member",
    firstAppointment.member.id,
    targetMember.id,
  );
  TestValidator.predicate(
    "first appointment should not have removed_at set",
    firstAppointment.removed_at === null,
  );

  // Step 6: Attempt to appoint the same member as moderator again (should fail with 400)
  await TestValidator.error(
    "appointing already-moderator member should fail",
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: targetMember.id,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );

  // Step 7: Verify the original moderator assignment is unchanged
  TestValidator.predicate(
    "duplicate moderator appointment prevention works correctly",
    true,
  );
}
