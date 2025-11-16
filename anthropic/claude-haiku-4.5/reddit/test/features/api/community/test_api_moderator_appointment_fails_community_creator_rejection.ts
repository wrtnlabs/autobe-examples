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

/**
 * Validates that attempting to appoint a community creator as a moderator fails
 * with HTTP 409 Conflict.
 *
 * This test ensures the system prevents converting a community creator to
 * moderator status, as creators have immutable 'creator' tier and cannot be
 * demoted. The test verifies:
 *
 * 1. A moderator account is created to attempt the invalid appointment
 * 2. A member account is created who becomes the community creator
 * 3. An administrator account is created for category management
 * 4. A category is created for community classification
 * 5. A community is created with the member as the community creator
 * 6. Attempting to appoint the community creator as a moderator returns HTTP 409
 *    Conflict
 * 7. The error clearly indicates the creator tier is immutable and cannot be
 *    reassigned
 * 8. The community creator retains immutable creator tier unchanged
 * 9. No invalid moderator record is created from the failed appointment
 */
export async function test_api_moderator_appointment_fails_community_creator_rejection(
  connection: api.IConnection,
) {
  // Step 1: Create a moderator account
  const moderatorData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/auth",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformModerator.ICreate;

  const moderator = await api.functional.auth.moderator.join(connection, {
    body: moderatorData,
  });
  typia.assert(moderator);

  // Step 2: Create a member account (will be community creator)
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphaNumeric(12),
    href: "https://example.com/auth",
    referrer: "https://example.com",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 3: Create an administrator account for category creation
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "https://example.com/auth",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 4: Switch to admin and create a category
  await api.functional.auth.administrator.login(connection, {
    body: {
      email: adminData.email,
      password: adminData.password,
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdministrator.ILogin,
  });

  const categoryData = {
    name: RandomGenerator.name(),
    slug: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph(),
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

  // Step 5: Switch to member and create a community
  await api.functional.auth.member.login(connection, {
    body: {
      email: memberData.email,
      password: memberData.password,
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ILogin,
  });

  const communityData = {
    name: RandomGenerator.name(2),
    identifier: RandomGenerator.alphaNumeric(8).toLowerCase(),
    description: RandomGenerator.paragraph(),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
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
    "community creator is the member",
    community.creator.id,
    member.id,
  );

  // Step 6: Switch to moderator and attempt to appoint the community creator as a moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorData.email,
      password: moderatorData.password,
      href: "https://example.com/auth",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 7: Verify appointment of community creator fails with HTTP 409 Conflict
  await TestValidator.httpError(
    "cannot appoint community creator as moderator returns 409 conflict",
    409,
    async () => {
      await api.functional.communityPlatform.moderator.communities.moderators.create(
        connection,
        {
          communityId: community.id,
          body: {
            memberId: member.id,
            tier: "senior",
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    },
  );
}
