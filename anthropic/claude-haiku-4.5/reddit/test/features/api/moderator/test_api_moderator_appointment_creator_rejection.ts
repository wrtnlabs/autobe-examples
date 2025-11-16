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
 * Test that attempting to appoint the community creator as a moderator is
 * rejected.
 *
 * This test validates that the system prevents appointing the community creator
 * as a moderator, returning HTTP 409 Conflict to prevent creator tier
 * conflicts. The business rule ensures that community creators maintain their
 * unique creator status and cannot be reassigned to moderator tiers.
 *
 * Workflow:
 *
 * 1. Set up administrator account
 * 2. Create a community category
 * 3. Create a member account (community creator)
 * 4. Create a community with the member as creator
 * 5. Attempt to appoint the community creator as moderator
 * 6. Validate HTTP 409 Conflict response
 */
export async function test_api_moderator_appointment_creator_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category management
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphabets(10),
    username: RandomGenerator.alphabets(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create a community category
  const categoryData = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphabets(8),
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create member account (will be community creator)
  const creatorEmail = typia.random<string & tags.Format<"email">>();
  const creatorData = {
    email: creatorEmail,
    username: RandomGenerator.alphabets(8),
    password: RandomGenerator.alphabets(10),
    ip: "127.0.0.1",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const creator = await api.functional.auth.member.join(connection, {
    body: creatorData,
  });
  typia.assert(creator);

  // Step 4: Create a community with the creator as owner
  const communityData = {
    name: RandomGenerator.name(),
    identifier: RandomGenerator.alphabets(8),
    description: RandomGenerator.paragraph(),
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator matches",
    community.creator.id,
    creator.id,
  );

  // Step 5 & 6: Attempt to appoint the community creator as a moderator - should fail with 409
  await TestValidator.httpError(
    "community creator appointment should fail with HTTP 409 Conflict",
    409,
    async () => {
      return await api.functional.communityPlatform.member.communities.moderators.create(
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
}
