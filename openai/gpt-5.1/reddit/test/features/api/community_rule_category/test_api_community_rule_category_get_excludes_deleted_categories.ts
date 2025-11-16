import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_rule_category_get_excludes_deleted_categories(
  connection: api.IConnection,
) {
  // 1. Register a platform administrator and authenticate
  const adminJoinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.example.com/register",
    referrer: "https://admin.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create a new community rule category as platform admin
  const categoryCode: string = `e2e_${RandomGenerator.alphaNumeric(12)}`;

  const createBody = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const createdCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      { body: createBody },
    );
  typia.assert(createdCategory);

  TestValidator.equals(
    "created category code should match input code",
    createdCategory.code,
    categoryCode,
  );

  // 3. Confirm the category is publicly retrievable via GET-by-code
  const fetchedBeforeDelete: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.communityRuleCategories.at(
      connection,
      { communityRuleCategoryCode: categoryCode },
    );
  typia.assert(fetchedBeforeDelete);

  TestValidator.equals(
    "fetched-before-delete category id should match created category id",
    fetchedBeforeDelete.id,
    createdCategory.id,
  );

  TestValidator.equals(
    "fetched-before-delete category code should match created category code",
    fetchedBeforeDelete.code,
    createdCategory.code,
  );

  // For a freshly created record, deleted_at should be null or undefined
  TestValidator.predicate(
    "deleted_at should be null or undefined before deletion",
    fetchedBeforeDelete.deleted_at === null ||
      fetchedBeforeDelete.deleted_at === undefined,
  );

  // 4. Delete the category using platformAdmin endpoint
  await api.functional.communityPlatform.platformAdmin.communityRuleCategories.erase(
    connection,
    { communityRuleCategoryCode: categoryCode },
  );

  // 5. Verify that public GET-by-code no longer returns the category and throws instead
  await TestValidator.error(
    "public GET-by-code should fail for deleted community rule category",
    async () => {
      await api.functional.communityPlatform.communityRuleCategories.at(
        connection,
        { communityRuleCategoryCode: categoryCode },
      );
    },
  );

  // 6. Optional: Confirm behavior is independent of authentication state
  // We keep using the same authenticated connection; the public endpoint
  // itself must hide deleted categories even for admins.
  await TestValidator.error(
    "public GET-by-code should still fail for deleted category even when authenticated",
    async () => {
      await api.functional.communityPlatform.communityRuleCategories.at(
        connection,
        { communityRuleCategoryCode: categoryCode },
      );
    },
  );
}
