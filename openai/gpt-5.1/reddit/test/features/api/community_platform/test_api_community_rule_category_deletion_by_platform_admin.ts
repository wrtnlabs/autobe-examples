import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can create and then delete a community
 * rule category by its business code.
 *
 * Business workflow covered by this test:
 *
 * 1. Register a new platform admin via /auth/platformAdmin/join and obtain an
 *    authenticated connection (token handled by SDK).
 * 2. As this admin, create a new global community rule category via
 *    /communityPlatform/platformAdmin/communityRuleCategories with a unique
 *    `code` and meaningful metadata.
 * 3. Verify the created category matches the request payload for core business
 *    fields (code, name, description, sort_order, is_active) and that the
 *    structure matches ICommunityPlatformCommunityRuleCategory.
 * 4. Delete the category by its `code` using the erase endpoint.
 * 5. Confirm the deletion succeeded by:
 *
 *    - Ensuring the erase call returns without error.
 *    - Attempting a second deletion on the same code and asserting that an error is
 *         thrown (indicating the category is no longer deletable).
 */
export async function test_api_community_rule_category_deletion_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform admin and authenticate
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin = await api.functional.auth.platformAdmin.join(connection, {
    body: joinBody,
  });
  typia.assert(admin);

  // 2. Create a new community rule category as this admin
  const categoryCode = `test_category_${RandomGenerator.alphaNumeric(8)}`;
  const categoryName = RandomGenerator.paragraph({ sentences: 2 });
  const categoryDescription = RandomGenerator.content({ paragraphs: 2 });

  // Use a random int32 directly for sort_order
  const sortOrder = typia.random<number & tags.Type<"int32">>();

  const createBody = {
    code: categoryCode,
    name: categoryName,
    description: categoryDescription,
    sort_order: sortOrder,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const createdCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCategory);

  // 3. Business-level assertions on the created category
  TestValidator.equals(
    "created category code matches request code",
    createdCategory.code,
    categoryCode,
  );
  TestValidator.equals(
    "created category name matches request name",
    createdCategory.name,
    categoryName,
  );
  TestValidator.equals(
    "created category description matches request description",
    createdCategory.description,
    categoryDescription,
  );
  TestValidator.equals(
    "created category sort_order matches request sort_order",
    createdCategory.sort_order,
    sortOrder,
  );
  TestValidator.equals(
    "created category is_active is true as requested",
    createdCategory.is_active,
    true,
  );

  // 4. Delete the category by its business code
  await api.functional.communityPlatform.platformAdmin.communityRuleCategories.erase(
    connection,
    {
      communityRuleCategoryCode: createdCategory.code,
    },
  );

  // 5. Ensure deletion effect by trying to delete again and expecting error
  await TestValidator.error(
    "second deletion of same category code should fail",
    async () => {
      await api.functional.communityPlatform.platformAdmin.communityRuleCategories.erase(
        connection,
        {
          communityRuleCategoryCode: createdCategory.code,
        },
      );
    },
  );
}
