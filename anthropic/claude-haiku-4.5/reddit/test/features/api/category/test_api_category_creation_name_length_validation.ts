import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test category name length validation constraints.
 *
 * Validates that category names are constrained to 1-255 characters. Tests the
 * failure case where a name exceeds 255 characters (longer than maximum allowed
 * length). The backend should reject this request with an error response.
 *
 * Test Flow:
 *
 * 1. Administrator joins the platform and authenticates
 * 2. Attempt to create a category with a name exceeding 255 characters
 * 3. Verify that the API properly rejects the request with validation error
 * 4. Verify that valid category creation works with proper name length
 */
export async function test_api_category_creation_name_length_validation(
  connection: api.IConnection,
) {
  // Step 1: Administrator authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "SecurePassword123!",
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Generate a name that exceeds 255 characters
  const baseText = RandomGenerator.paragraph({ sentences: 10 });
  const oversizedName = baseText + baseText; // Concatenate to exceed 255 characters

  // Verify the name is indeed too long
  TestValidator.predicate(
    "generated name exceeds 255 character limit",
    oversizedName.length > 255,
  );

  // Step 3: Test that API rejects the oversized name
  await TestValidator.error(
    "category creation with oversized name should fail",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: oversizedName,
            slug: RandomGenerator.alphabets(15).toLowerCase(),
            description: RandomGenerator.paragraph(),
            icon_url: typia.random<string & tags.Format<"uri">>(),
            display_order: typia.random<
              number & tags.Type<"int32"> & tags.Minimum<0>
            >(),
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );

  // Step 4: Verify that valid category creation works with proper name length
  const validName = RandomGenerator.paragraph({ sentences: 3 });
  TestValidator.predicate(
    "valid name is within 1-255 character range",
    validName.length >= 1 && validName.length <= 255,
  );

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: validName,
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(createdCategory);
  TestValidator.equals(
    "created category name matches input",
    createdCategory.name,
    validName,
  );
}
