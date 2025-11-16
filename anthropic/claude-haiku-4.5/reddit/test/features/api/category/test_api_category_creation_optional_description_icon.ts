import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

export async function test_api_category_creation_optional_description_icon(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for API access
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: "SecurePassword123",
      username: RandomGenerator.alphabets(10),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Step 2: Create category WITHOUT optional fields (description and icon_url)
  const categoryWithoutOptionals =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithoutOptionals);
  TestValidator.equals(
    "category without optionals has null description",
    categoryWithoutOptionals.description,
    null,
  );
  TestValidator.equals(
    "category without optionals has null icon_url",
    categoryWithoutOptionals.icon_url,
    null,
  );

  // Step 3: Create category WITH optional fields (description and icon_url)
  const categoryWithOptionals =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          slug: RandomGenerator.alphabets(8).toLowerCase(),
          display_order: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<0>
          >(),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 5,
            sentenceMax: 10,
          }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(categoryWithOptionals);
  TestValidator.predicate(
    "category with optionals has non-null description",
    categoryWithOptionals.description !== null &&
      categoryWithOptionals.description !== undefined,
  );
  TestValidator.predicate(
    "category with optionals has non-null icon_url",
    categoryWithOptionals.icon_url !== null &&
      categoryWithOptionals.icon_url !== undefined,
  );

  // Step 4: Verify both categories have all required fields
  TestValidator.predicate(
    "category without optionals has valid id",
    categoryWithoutOptionals.id !== null &&
      categoryWithoutOptionals.id !== undefined,
  );
  TestValidator.predicate(
    "category without optionals has valid name",
    categoryWithoutOptionals.name !== null &&
      categoryWithoutOptionals.name !== undefined,
  );
  TestValidator.predicate(
    "category without optionals has valid slug",
    categoryWithoutOptionals.slug !== null &&
      categoryWithoutOptionals.slug !== undefined,
  );
  TestValidator.predicate(
    "category without optionals has valid display_order",
    typeof categoryWithoutOptionals.display_order === "number",
  );
  TestValidator.predicate(
    "category without optionals is active",
    categoryWithoutOptionals.is_active === true,
  );

  TestValidator.predicate(
    "category with optionals has valid id",
    categoryWithOptionals.id !== null && categoryWithOptionals.id !== undefined,
  );
  TestValidator.predicate(
    "category with optionals has valid name",
    categoryWithOptionals.name !== null &&
      categoryWithOptionals.name !== undefined,
  );
  TestValidator.predicate(
    "category with optionals has valid slug",
    categoryWithOptionals.slug !== null &&
      categoryWithOptionals.slug !== undefined,
  );
  TestValidator.predicate(
    "category with optionals has valid display_order",
    typeof categoryWithOptionals.display_order === "number",
  );
  TestValidator.predicate(
    "category with optionals is active",
    categoryWithOptionals.is_active === true,
  );
}
