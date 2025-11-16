import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

/**
 * Validate that a platform administrator can update mutable metadata of a
 * community rule category while preserving its identity fields.
 *
 * Business flow:
 *
 * 1. Register a new platform administrator using the auth join endpoint, which
 *    also establishes an authenticated session on the shared connection.
 * 2. Create a baseline community rule category using the platform admin
 *    communityRuleCategories.create endpoint, capturing its id, code and
 *    timestamps.
 * 3. Prepare an update payload that modifies only mutable fields (name,
 *    description, is_active, sort_order) without touching identity attributes.
 * 4. Call the communityRuleCategories.update endpoint with the original category
 *    code and the update payload.
 * 5. Verify that:
 *
 *    - Id remains unchanged.
 *    - Code remains unchanged.
 *    - Mutable fields reflect the new values.
 *    - Deleted_at remains null.
 *    - Updated_at is greater than or equal to created_at and has advanced compared
 *         to the original updated_at value.
 */
export async function test_api_community_rule_category_update_by_platform_admin(
  connection: api.IConnection,
) {
  // 1. Register a new platform administrator and establish auth context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create a baseline community rule category
  const createBody = {
    code: `cat_${RandomGenerator.alphaNumeric(8)}`,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    sort_order: typia.random<number & tags.Type<"int32">>(),
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const created: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: createBody,
      },
    );
  typia.assert(created);

  // Basic invariants on the created entity
  TestValidator.equals(
    "created.code equals request code",
    created.code,
    createBody.code,
  );
  TestValidator.equals(
    "created.name equals request name",
    created.name,
    createBody.name,
  );
  TestValidator.equals(
    "created.description equals request description",
    created.description,
    createBody.description,
  );
  TestValidator.equals(
    "created.sort_order equals request sort_order",
    created.sort_order,
    createBody.sort_order,
  );
  TestValidator.equals(
    "created.is_active equals request is_active",
    created.is_active,
    createBody.is_active,
  );

  const originalId = created.id;
  const originalCode = created.code;
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;
  const originalDeletedAt = created.deleted_at ?? null;

  // 3. Prepare an update payload that modifies mutable fields
  const updatedName = `${created.name} (updated)`;
  const updatedDescription = RandomGenerator.content({ paragraphs: 1 });
  const updatedIsActive = !created.is_active;
  const updatedSortOrder = typia.random<number & tags.Type<"int32">>();

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    is_active: updatedIsActive,
    sort_order: updatedSortOrder,
  } satisfies ICommunityPlatformCommunityRuleCategory.IUpdate;

  // 4. Call update endpoint with original business code
  const updated: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.update(
      connection,
      {
        communityRuleCategoryCode: originalCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // 5. Validate identity preservation and field updates
  TestValidator.equals(
    "id must remain unchanged after update",
    updated.id,
    originalId,
  );
  TestValidator.equals(
    "code must remain unchanged after update",
    updated.code,
    originalCode,
  );

  TestValidator.equals(
    "name should reflect updated value",
    updated.name,
    updatedName,
  );
  TestValidator.equals(
    "description should reflect updated value",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "is_active should reflect updated flag",
    updated.is_active,
    updatedIsActive,
  );
  TestValidator.equals(
    "sort_order should reflect updated value",
    updated.sort_order,
    updatedSortOrder,
  );

  // deleted_at should remain null (or unchanged if non-null is ever used)
  TestValidator.equals(
    "deleted_at should remain unchanged after update",
    updated.deleted_at ?? null,
    originalDeletedAt,
  );

  // Temporal relationships: updated_at should be >= created_at and advanced
  const createdAtDate = new Date(originalCreatedAt).getTime();
  const updatedAtBeforeDate = new Date(originalUpdatedAt).getTime();
  const updatedAtAfterDate = new Date(updated.updated_at).getTime();

  TestValidator.predicate(
    "updated_at should be greater than or equal to created_at",
    updatedAtAfterDate >= createdAtDate,
  );

  TestValidator.predicate(
    "updated_at after update should be >= previous updated_at",
    updatedAtAfterDate >= updatedAtBeforeDate,
  );
}
