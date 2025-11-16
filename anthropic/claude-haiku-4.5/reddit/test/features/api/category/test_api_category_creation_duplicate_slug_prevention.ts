import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that duplicate category slugs are rejected.
 *
 * This test validates the uniqueness constraint on category slugs within the
 * platform. An administrator creates a category with a specific slug
 * identifier, then attempts to create another category with the same slug. The
 * system must reject the duplicate slug creation with appropriate error
 * handling, confirming that category slugs are globally unique and preventing
 * naming collisions in the category taxonomy.
 *
 * Test workflow:
 *
 * 1. Administrator joins the platform
 * 2. Create first category with slug 'technology'
 * 3. Attempt to create second category with same slug 'technology'
 * 4. Verify that duplicate slug creation fails with error
 */
export async function test_api_category_creation_duplicate_slug_prevention(
  connection: api.IConnection,
) {
  // 1. Administrator joins the platform
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminData = {
    email: adminEmail,
    password: "AdminPassword123",
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin/join",
    referrer: null,
    ip: "127.0.0.1",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminData,
    });
  typia.assert(admin);

  // 2. Create first category with slug 'technology'
  const firstCategoryData = {
    name: "Technology",
    slug: "technology",
    description: "Communities focused on technology and software development",
    icon_url: null,
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const firstCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: firstCategoryData,
      },
    );
  typia.assert(firstCategory);
  TestValidator.equals(
    "first category slug matches",
    firstCategory.slug,
    "technology",
  );

  // 3. Attempt to create second category with same slug 'technology'
  const secondCategoryData = {
    name: "Tech World",
    slug: "technology",
    description: "Another technology-related category",
    icon_url: null,
    display_order: 2,
  } satisfies ICommunityPlatformCategory.ICreate;

  // 4. Verify that duplicate slug creation fails
  await TestValidator.error("duplicate slug should be rejected", async () => {
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: secondCategoryData,
      },
    );
  });
}
