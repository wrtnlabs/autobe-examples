import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that display_order validation rejects negative values.
 *
 * This test validates that the category creation endpoint properly enforces the
 * constraint that display_order must be a non-negative integer (>= 0).
 * Attempting to create a category with a negative display_order value should
 * result in a validation error from the API.
 *
 * Test flow:
 *
 * 1. Administrator registers and authenticates to gain necessary permissions
 * 2. Attempt to create a category with display_order = -1 (invalid negative value)
 * 3. Verify that the API rejects this invalid request
 * 4. Confirm validation prevents negative display_order values in category
 *    creation
 */
export async function test_api_category_creation_negative_display_order(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  // Authenticate as administrator to gain permission for category creation
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(10);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: "http://localhost:3000",
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Attempt to create category with negative display_order
  // This should fail because display_order must be >= 0
  await TestValidator.error(
    "negative display_order should fail validation",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: RandomGenerator.name(2),
            slug: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph(),
            icon_url: null,
            display_order: -1, // Invalid: negative value
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 3: Validate with edge case - display_order = 0 (should succeed)
  const categoryWithZeroOrder: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          icon_url: null,
          display_order: 0, // Valid: zero is acceptable
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithZeroOrder);
  TestValidator.equals(
    "display_order should be 0",
    categoryWithZeroOrder.display_order,
    0,
  );

  // Step 4: Validate positive display_order works correctly
  const categoryWithPositiveOrder: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: `category-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph(),
          icon_url: null,
          display_order: 100, // Valid: positive value
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithPositiveOrder);
  TestValidator.predicate(
    "display_order should be positive",
    categoryWithPositiveOrder.display_order > 0,
  );
}
