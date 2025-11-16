import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_creation_timestamp_generation(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for authentication
  const administrator: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphabets(12),
        username: RandomGenerator.alphabets(10),
        name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: null,
        ip: null,
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(administrator);

  // Step 2: Record the current time before creating category for timestamp validation
  const beforeCreation = new Date();

  // Step 3: Create a new category with required fields
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 1, wordMin: 2, wordMax: 4 }),
    slug: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    icon_url: null,
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies ICommunityPlatformCategory.ICreate;

  const createdCategory: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(createdCategory);

  // Step 4: Record time after category creation
  const afterCreation = new Date();

  // Step 5: Validate that created_at timestamp exists and is in ISO 8601 format
  TestValidator.predicate("created_at should be valid ISO 8601 format", () => {
    const iso8601Pattern =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3,9})?(Z|[+-]\d{2}:\d{2})$/;
    const createdAt = new Date(createdCategory.created_at);
    return (
      !isNaN(createdAt.getTime()) &&
      iso8601Pattern.test(createdCategory.created_at)
    );
  });

  // Step 6: Validate that updated_at timestamp exists and is in ISO 8601 format
  TestValidator.predicate("updated_at should be valid ISO 8601 format", () => {
    const iso8601Pattern =
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3,9})?(Z|[+-]\d{2}:\d{2})$/;
    const updatedAt = new Date(createdCategory.updated_at);
    return (
      !isNaN(updatedAt.getTime()) &&
      iso8601Pattern.test(createdCategory.updated_at)
    );
  });

  // Step 7: Verify that created_at is within expected time range (with tolerance)
  const createdAtTime = new Date(createdCategory.created_at).getTime();
  const tolerance = 2000; // Allow 2 second tolerance for clock skew
  TestValidator.predicate(
    "created_at should be within expected time range",
    createdAtTime >= beforeCreation.getTime() - tolerance &&
      createdAtTime <= afterCreation.getTime() + tolerance,
  );

  // Step 8: Verify that updated_at equals created_at on initial creation
  const createdAtMs = new Date(createdCategory.created_at).getTime();
  const updatedAtMs = new Date(createdCategory.updated_at).getTime();
  TestValidator.predicate(
    "updated_at should equal created_at upon initial creation",
    Math.abs(createdAtMs - updatedAtMs) < 1000, // Allow 1 second tolerance
  );

  // Step 9: Verify that both timestamps represent valid dates
  TestValidator.predicate(
    "created_at should parse to valid date",
    !isNaN(new Date(createdCategory.created_at).getTime()),
  );

  TestValidator.predicate(
    "updated_at should parse to valid date",
    !isNaN(new Date(createdCategory.updated_at).getTime()),
  );
}
