import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_creation_duplicate_slug(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "ValidPassword123";
  const adminUsername = RandomGenerator.alphabets(5);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: adminUsername,
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create first category with unique slug
  const uniqueSlug = `test-category-${RandomGenerator.alphaNumeric(8)}`;
  const firstCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: uniqueSlug,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category slug matches",
    firstCategory.slug,
    uniqueSlug,
  );

  // Step 3: Attempt to create second category with same slug - should fail with 409
  await TestValidator.error(
    "duplicate slug should cause conflict error",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: {
            name: RandomGenerator.paragraph({ sentences: 1 }),
            slug: uniqueSlug,
            display_order: 2,
          } satisfies ICommunityPlatformCategory.ICreate,
        },
      );
    },
  );
}
