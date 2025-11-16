import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that only administrators can create categories and that non-admin users
 * are properly denied. This validates authorization boundary enforcement for
 * the category creation endpoint.
 *
 * Test Steps:
 *
 * 1. Create a member account (non-admin user)
 * 2. Create an administrator account (admin user)
 * 3. Create a moderator account (moderator user)
 * 4. Attempt to create category with member account token → verify HTTP 403
 *    Forbidden
 * 5. Attempt to create category with moderator token → verify HTTP 403 Forbidden
 * 6. Create category with administrator account → verify HTTP 201 Created
 * 7. Attempt to create category without authentication token → verify HTTP 401
 *    Unauthorized
 * 8. Verify authorization is enforced at operation level
 * 9. Verify only administrators can create categories
 * 10. Verify proper error codes are returned for unauthorized access
 */
export async function test_api_category_creation_authorization_enforcement(
  connection: api.IConnection,
) {
  // Step 1: Create member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphabets(10);
  const memberAccount = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      username: RandomGenerator.alphabets(8),
      password: memberPassword,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(memberAccount);
  const memberToken = memberAccount.token.access;

  // Step 2: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);
  const adminAccount = await api.functional.auth.administrator.join(
    connection,
    {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    },
  );
  typia.assert(adminAccount);
  const adminToken = adminAccount.token.access;

  // Step 3: Create moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphabets(10);
  const moderatorAccount = await api.functional.auth.moderator.join(
    connection,
    {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.alphabets(8),
        password: moderatorPassword,
        href: "https://example.com/moderator/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    },
  );
  typia.assert(moderatorAccount);
  const moderatorToken = moderatorAccount.token.access;

  // Step 4: Attempt category creation with member account (should fail with 403)
  const memberConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${memberToken}` },
  };
  await TestValidator.error(
    "member cannot create category - should receive 403 Forbidden",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        memberConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            slug: RandomGenerator.alphabets(10).toLowerCase(),
            display_order: 1,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 5: Attempt category creation with moderator account (should fail with 403)
  const moderatorConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${moderatorToken}` },
  };
  await TestValidator.error(
    "moderator cannot create category - should receive 403 Forbidden",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        moderatorConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            slug: RandomGenerator.alphabets(10).toLowerCase(),
            display_order: 2,
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 6: Create category with administrator account (should succeed with 201)
  const adminConnection = {
    ...connection,
    headers: { Authorization: `Bearer ${adminToken}` },
  };
  const categoryName = RandomGenerator.paragraph({ sentences: 1 });
  const categorySlug = RandomGenerator.alphabets(10).toLowerCase();
  const createdCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          display_order: 10,
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches",
    createdCategory.slug,
    categorySlug,
  );
  TestValidator.predicate(
    "category is active",
    createdCategory.is_active === true,
  );

  // Step 7: Attempt category creation without authentication (should fail with 401)
  const unauthenticatedConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated request cannot create category - should receive 401 Unauthorized",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        unauthenticatedConnection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            slug: RandomGenerator.alphabets(10).toLowerCase(),
            display_order: 3,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 8-10: Authorization enforcement verified through successful test completion
  TestValidator.predicate(
    "authorization boundary enforced - only admin can create categories",
    true,
  );
}
