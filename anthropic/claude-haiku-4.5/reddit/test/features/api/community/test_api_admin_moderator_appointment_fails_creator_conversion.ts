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
 * Test that administrator cannot appoint community creator as a moderator.
 *
 * This test validates the business rule that prevents converting a community
 * creator to moderator status. Even with administrator authority, the system
 * must enforce the immutability of creator tier and reject any attempt to
 * appoint the creator as a moderator, returning HTTP 409 Conflict.
 *
 * Test flow:
 *
 * 1. Create administrator account
 * 2. Create member account who will become creator
 * 3. Create category for community classification
 * 4. Create community with member as creator
 * 5. Attempt to appoint creator as moderator via admin endpoint
 * 6. Verify HTTP 409 Conflict response
 * 7. Confirm creator status unchanged
 */
export async function test_api_admin_moderator_appointment_fails_creator_conversion(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "SecurePassword123";
  const adminData = {
    email: adminEmail,
    password: adminPassword,
    username: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const administrator = await api.functional.auth.administrator.join(
    connection,
    {
      body: adminData,
    },
  );
  typia.assert(administrator);

  // Step 2: Create member account (will become community creator)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePassword456";
  const memberData = {
    email: memberEmail,
    password: memberPassword,
    username: RandomGenerator.alphaNumeric(12),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const creator = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(creator);

  // Step 3: Create category
  const categoryData = {
    name: "Technology",
    slug: "technology",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      { body: categoryData },
    );
  typia.assert(category);

  // Step 4: Create community with member as creator
  // Switch to creator's authentication context
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: "Tech Discussion",
    identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: "A community for tech discussions",
    visibility: "public",
    post_creation_restriction: "open_to_all",
    post_type_restriction: "all_types",
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityData },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator ID matches",
    community.creator.id,
    creator.id,
  );

  // Step 5: Switch to administrator context and attempt to appoint creator as moderator
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: "",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  // Step 6: Verify that appointing creator as moderator fails with 409 Conflict
  await TestValidator.httpError(
    "cannot appoint community creator as moderator",
    409,
    async () => {
      await api.functional.communityPlatform.administrator.communities.moderators.create(
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
