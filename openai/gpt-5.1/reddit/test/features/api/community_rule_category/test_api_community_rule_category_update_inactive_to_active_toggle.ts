import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_rule_category_update_inactive_to_active_toggle(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a platform administrator
  const adminJoinBody = {
    username: RandomGenerator.alphaNumeric(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Create an inactive community rule category
  const categoryCode: string = `e2e_${RandomGenerator.alphaNumeric(8)}`;

  const createBody = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 5 }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: false,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const createdCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(createdCategory);

  // Snapshot key identity and timestamps before update
  const originalId = createdCategory.id;
  const originalCode = createdCategory.code;
  const originalCreatedAt = createdCategory.created_at;
  const originalUpdatedAt = createdCategory.updated_at;
  const originalDeletedAt = createdCategory.deleted_at ?? null;

  TestValidator.predicate(
    "newly created category must start as inactive",
    createdCategory.is_active === false,
  );

  // 3. Update the category to activate it (toggle is_active => true)
  const updateBody = {
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.IUpdate;

  const updatedCategory: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.update(
      connection,
      {
        communityRuleCategoryCode: originalCode,
        body: updateBody,
      },
    );
  typia.assert(updatedCategory);

  // 4. Business validations after update
  TestValidator.equals(
    "category id must remain stable after activation toggle",
    updatedCategory.id,
    originalId,
  );

  TestValidator.equals(
    "category code must remain unchanged after activation toggle",
    updatedCategory.code,
    originalCode,
  );

  TestValidator.predicate(
    "category should now be active after update",
    updatedCategory.is_active === true,
  );

  TestValidator.notEquals(
    "updated_at should change after update operation",
    updatedCategory.updated_at,
    originalUpdatedAt,
  );

  TestValidator.equals(
    "created_at must remain unchanged after update",
    updatedCategory.created_at,
    originalCreatedAt,
  );

  TestValidator.equals(
    "deleted_at should remain null or undefined after activation toggle",
    updatedCategory.deleted_at ?? null,
    originalDeletedAt,
  );
}
