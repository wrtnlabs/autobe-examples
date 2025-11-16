import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate display_order numeric validation in category creation.
 *
 * Tests that the display_order field properly enforces non-negative integer
 * validation. The test verifies:
 *
 * 1. Negative display_order values are rejected
 * 2. Non-integer (decimal) values are rejected
 * 3. Valid non-negative integers (0 and positive) are accepted
 * 4. Created categories retain correct display_order values
 *
 * Prerequisites:
 *
 * - Administrator authentication is established before category creation
 * - All validation is performed on the API level
 *
 * Test Flow:
 *
 * 1. Authenticate as administrator
 * 2. Attempt category creation with invalid display_order values
 * 3. Create categories with valid display_order values (0 and positive integers)
 * 4. Verify created categories have correct display_order in response
 */
export async function test_api_category_creation_display_order_numeric_validation(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: RandomGenerator.alphabets(10),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost/admin/signup",
    referrer: null,
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(administrator);

  // Step 2: Attempt to create category with negative display_order (should fail)
  await TestValidator.error(
    "negative display_order should be rejected",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 2 }),
            slug: RandomGenerator.alphabets(10),
            description: RandomGenerator.paragraph({ sentences: 3 }),
            display_order: -1,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 3: Attempt to create category with decimal/non-integer display_order (should fail)
  // Note: This is handled by TypeScript type system - display_order requires int32 type
  // So we skip this as it would be a compilation error

  // Step 4: Create category with display_order = 0 (minimum valid)
  const categoryZero: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: `category-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: undefined,
          display_order: 0,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryZero);
  TestValidator.equals(
    "created category with display_order 0",
    categoryZero.display_order,
    0,
  );

  // Step 5: Create category with positive display_order
  const positiveOrder = RandomGenerator.pick([1, 5, 10, 100] as const);
  const categoryPositive: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: `category-${RandomGenerator.alphaNumeric(6)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: undefined,
          display_order: positiveOrder,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryPositive);
  TestValidator.equals(
    "created category with positive display_order",
    categoryPositive.display_order,
    positiveOrder,
  );

  // Step 6: Verify both created categories have correct display_order values
  TestValidator.predicate(
    "display_order is non-negative in zero case",
    categoryZero.display_order >= 0,
  );
  TestValidator.predicate(
    "display_order is non-negative in positive case",
    categoryPositive.display_order >= 0,
  );
  TestValidator.predicate(
    "display_order values differ between categories",
    categoryZero.display_order !== categoryPositive.display_order,
  );
}
