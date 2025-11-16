import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test authorization restrictions preventing junior moderators from updating
 * community settings.
 *
 * Validates that junior moderators with limited permissions cannot update
 * community configuration. The update operation should be rejected with a 403
 * Forbidden authorization error, confirming that only senior moderators and
 * administrators can modify community settings.
 *
 * Test flow:
 *
 * 1. Create member account to serve as community creator
 * 2. Create junior moderator account to test authorization failure
 * 3. Create category for community classification
 * 4. Create community owned by the member
 * 5. Attempt to update community settings as junior moderator
 * 6. Verify operation fails with 403 Forbidden error
 */
export async function test_api_community_update_unauthorized_junior_moderator(
  connection: api.IConnection,
) {
  // Step 1: Create member account as community creator
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "TestPassword123!";
  const creatorMember = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: memberPassword,
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(creatorMember);

  // Step 2: Create junior moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = "ModPassword123!";
  const juniorModerator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      username: RandomGenerator.alphaNumeric(8),
      password: moderatorPassword,
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ICreate,
  });
  typia.assert(juniorModerator);

  // Step 3: Create category for community
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminUser = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      username: RandomGenerator.alphaNumeric(8),
      name: RandomGenerator.name(),
      href: "http://localhost:3000/auth/register",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(adminUser);

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphaNumeric(10),
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Create community owned by the member
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          visibility: "public" as const,
          post_creation_restriction: "open_to_all" as const,
          post_type_restriction: "all_types" as const,
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // Step 5: Authenticate as junior moderator
  await api.functional.auth.moderator.login(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: "http://localhost:3000/auth/login",
      referrer: "http://localhost:3000",
    } satisfies ICommunityPlatformModerator.ILogin,
  });

  // Step 6: Verify update operation fails with 403 Forbidden authorization error
  await TestValidator.httpError(
    "junior moderator cannot update community settings",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communities.update(
        connection,
        {
          communityId: community.id,
          body: {
            name: RandomGenerator.name(2),
            description: RandomGenerator.paragraph({ sentences: 3 }),
          } satisfies ICommunityPlatformCommunity.IUpdate,
        },
      );
    },
  );
}
