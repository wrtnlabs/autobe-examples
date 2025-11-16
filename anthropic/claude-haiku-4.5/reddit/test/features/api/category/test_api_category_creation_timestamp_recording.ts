import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that category creation records proper timestamps.
 *
 * An administrator creates a category and the test validates that created_at
 * and updated_at timestamps are recorded with current time (approximately). The
 * timestamps should be in ISO 8601 UTC format. This confirms that the system
 * properly tracks category lifecycle events.
 *
 * Process:
 *
 * 1. Administrator joins the platform to obtain authentication
 * 2. Administrator creates a new category with required and optional fields
 * 3. Validate that the response contains proper timestamps in ISO 8601 format
 * 4. Verify timestamps are approximately current time
 * 5. Confirm created_at and updated_at are equal (both set at creation time)
 */
export async function test_api_category_creation_timestamp_recording(
  connection: api.IConnection,
) {
  // Step 1: Administrator joins the platform
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphabets(12);

  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: adminPassword,
        username: RandomGenerator.name(1),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Step 2: Record the time before category creation for validation
  const beforeCreation = new Date();

  // Step 3: Create a category with all required fields
  const categoryName = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 2,
    wordMax: 4,
  });
  const categorySlug = categoryName
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^a-z0-9-]/g, "");

  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: categoryName,
          slug: categorySlug,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Step 4: Record the time after category creation
  const afterCreation = new Date();

  // Step 5: Validate timestamps are valid ISO 8601 format
  TestValidator.predicate(
    "created_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      category.created_at,
    ),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601 format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(
      category.updated_at,
    ),
  );

  // Step 6: Validate timestamps are approximately current time
  const createdAtTime = new Date(category.created_at);
  const updatedAtTime = new Date(category.updated_at);

  TestValidator.predicate(
    "created_at is approximately current time (within 5 seconds before creation)",
    createdAtTime >= new Date(beforeCreation.getTime() - 5000),
  );
  TestValidator.predicate(
    "created_at is approximately current time (within 5 seconds after creation)",
    createdAtTime <= new Date(afterCreation.getTime() + 5000),
  );

  TestValidator.predicate(
    "updated_at is approximately current time (within 5 seconds before creation)",
    updatedAtTime >= new Date(beforeCreation.getTime() - 5000),
  );
  TestValidator.predicate(
    "updated_at is approximately current time (within 5 seconds after creation)",
    updatedAtTime <= new Date(afterCreation.getTime() + 5000),
  );

  // Step 7: Verify created_at and updated_at are equal at creation time
  TestValidator.equals(
    "created_at and updated_at are equal at category creation",
    category.created_at,
    category.updated_at,
  );

  // Step 8: Validate other response fields match the request
  TestValidator.equals(
    "category name matches request",
    category.name,
    categoryName,
  );
  TestValidator.equals(
    "category slug matches request",
    category.slug,
    categorySlug,
  );
}
