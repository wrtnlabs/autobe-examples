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
 * Test that administrator appointment authority overrides community creator
 * restrictions.
 *
 * Verifies that administrators can appoint moderators even in communities they
 * did not create. Ensures administrator system-wide authority enables
 * moderation management across all communities without requiring creator
 * consent. Validates that appointments proceed normally despite potential
 * creator objections or community-specific policies.
 *
 * Test Flow:
 *
 * 1. Create an administrator account with system-wide authority
 * 2. Create a member account who will be the community creator (not the admin)
 * 3. Create a category for community organization
 * 4. Create a community by the non-administrator member
 * 5. Create a target member to be appointed as moderator
 * 6. Authenticate as administrator and appoint the target member as moderator
 * 7. Verify the moderator appointment succeeded and bypassed community
 *    restrictions
 */
export async function test_api_admin_moderator_appointment_bypasses_community_restrictions(
  connection: api.IConnection,
) {
  // Step 1: Create an administrator account with system-wide authority
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: RandomGenerator.alphabets(10),
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);
  TestValidator.predicate(
    "administrator account created",
    administrator.id !== undefined,
  );

  // Step 2: Create a member account who will be the community creator
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creator: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: creatorEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(creator);
  TestValidator.predicate(
    "creator member account created",
    creator.id !== undefined,
  );

  // Step 3: Create a category for community organization
  // Switch to administrator connection for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${administrator.token.access}` },
  };
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph(),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create a community by the non-administrator creator member
  const creatorConnection: api.IConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${creator.token.access}` },
  };
  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      creatorConnection,
      {
        body: {
          name: RandomGenerator.name(3),
          identifier: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community created by member",
    community.creator.id,
    creator.id,
  );

  // Step 5: Create a target member to be appointed as moderator
  const targetEmail = typia.random<string & tags.Format<"email">>();
  const targetMember: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: targetEmail,
        username: RandomGenerator.alphabets(8),
        password: RandomGenerator.alphabets(10),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: "127.0.0.1",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(targetMember);
  TestValidator.predicate(
    "target member created",
    targetMember.id !== undefined,
  );

  // Step 6: Authenticate as administrator and appoint the target member as moderator
  // This demonstrates that administrator authority bypasses community creator restrictions
  const moderator: ICommunityPlatformCommunityModerator =
    await api.functional.communityPlatform.administrator.communities.moderators.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          memberId: targetMember.id,
          tier: "senior",
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);

  // Step 7: Verify the moderator appointment succeeded and bypassed community restrictions
  TestValidator.equals(
    "moderator community ID matches target community",
    moderator.community.id,
    community.id,
  );
  TestValidator.equals(
    "moderator member ID matches target member",
    moderator.member.id,
    targetMember.id,
  );
  TestValidator.equals(
    "moderator tier is senior",
    moderator.moderator_tier,
    "senior",
  );
  TestValidator.predicate(
    "moderator is currently active",
    moderator.removed_at === null,
  );
  TestValidator.predicate(
    "moderator has valid appointment timestamp",
    moderator.appointed_at !== undefined,
  );
  TestValidator.predicate(
    "administrator successfully appointed moderator in non-owned community",
    moderator.id !== undefined,
  );
}
