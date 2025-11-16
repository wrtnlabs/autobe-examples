import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAccountStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAccountStatus";
import type { ICommunityPlatformCommunityRuleCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRuleCategory";
import type { ICommunityPlatformPlatformadmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPlatformadmin";

export async function test_api_community_rule_category_get_reflects_updates(
  connection: api.IConnection,
) {
  // 1. Join as platform admin to obtain authorized context
  const joinBody = {
    username: RandomGenerator.alphabets(12),
    email: `${RandomGenerator.alphabets(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    displayName: RandomGenerator.name(),
    href: "https://admin.console.example.com/register",
    referrer: "https://admin.console.example.com/landing",
  } satisfies ICommunityPlatformPlatformadmin.IJoin;

  const admin: ICommunityPlatformPlatformadmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinBody,
    });
  typia.assert(admin);

  // 2. Create initial community rule category
  const categoryCode = `e2e_${RandomGenerator.alphaNumeric(12)}`;
  const initialCreateBody = {
    code: categoryCode,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    sort_order: 10,
    is_active: true,
  } satisfies ICommunityPlatformCommunityRuleCategory.ICreate;

  const created: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.create(
      connection,
      {
        body: initialCreateBody,
      },
    );
  typia.assert(created);

  // Capture original timestamps and mutable fields
  const originalCreatedAt = created.created_at;
  const originalUpdatedAt = created.updated_at;
  const originalName = created.name;
  const originalDescription = created.description;
  const originalSortOrder = created.sort_order;
  const originalIsActive = created.is_active;

  // 3. Update the category with new values
  const updatedName = RandomGenerator.paragraph({ sentences: 3 });
  const updatedDescription = RandomGenerator.content({ paragraphs: 3 });
  const updatedSortOrder = 20;
  const updatedIsActive = !originalIsActive;

  const updateBody = {
    name: updatedName,
    description: updatedDescription,
    sort_order: updatedSortOrder,
    is_active: updatedIsActive,
  } satisfies ICommunityPlatformCommunityRuleCategory.IUpdate;

  const updated: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.platformAdmin.communityRuleCategories.update(
      connection,
      {
        communityRuleCategoryCode: categoryCode,
        body: updateBody,
      },
    );
  typia.assert(updated);

  // In-API response validation after update
  TestValidator.equals(
    "code must remain unchanged after update",
    updated.code,
    created.code,
  );
  TestValidator.equals(
    "id must remain unchanged after update",
    updated.id,
    created.id,
  );
  TestValidator.equals(
    "name must reflect updated value in update response",
    updated.name,
    updatedName,
  );
  TestValidator.equals(
    "description must reflect updated value in update response",
    updated.description,
    updatedDescription,
  );
  TestValidator.equals(
    "sort_order must reflect updated value in update response",
    updated.sort_order,
    updatedSortOrder,
  );
  TestValidator.equals(
    "is_active must reflect updated value in update response",
    updated.is_active,
    updatedIsActive,
  );

  // Ensure timestamps reflect an update
  TestValidator.equals(
    "created_at must remain the same after update",
    updated.created_at,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at must change after update",
    updated.updated_at,
    originalUpdatedAt,
  );

  // Basic temporal sanity: updated_at should be >= created_at (string compare works for ISO)
  TestValidator.predicate(
    "updated_at must be greater than or equal to created_at",
    updated.updated_at >= updated.created_at,
  );

  // 4. Fetch the category via public GET-by-code endpoint
  const fetched: ICommunityPlatformCommunityRuleCategory =
    await api.functional.communityPlatform.communityRuleCategories.at(
      connection,
      {
        communityRuleCategoryCode: categoryCode,
      },
    );
  typia.assert(fetched);

  // 5. Validate that GET reflects the latest state from update
  TestValidator.equals(
    "fetched id must match updated id",
    fetched.id,
    updated.id,
  );
  TestValidator.equals(
    "fetched code must match updated code",
    fetched.code,
    updated.code,
  );

  TestValidator.equals(
    "fetched name must match updated name",
    fetched.name,
    updatedName,
  );
  TestValidator.equals(
    "fetched description must match updated description",
    fetched.description,
    updatedDescription,
  );
  TestValidator.equals(
    "fetched sort_order must match updated sort_order",
    fetched.sort_order,
    updatedSortOrder,
  );
  TestValidator.equals(
    "fetched is_active must match updated is_active",
    fetched.is_active,
    updatedIsActive,
  );

  // Ensure old values are no longer present on the fetched entity
  TestValidator.notEquals(
    "fetched name must not equal original name",
    fetched.name,
    originalName,
  );
  TestValidator.notEquals(
    "fetched description must not equal original description",
    fetched.description,
    originalDescription,
  );
  TestValidator.notEquals(
    "fetched sort_order must not equal original sort_order",
    fetched.sort_order,
    originalSortOrder,
  );
  TestValidator.notEquals(
    "fetched is_active must not equal original is_active",
    fetched.is_active,
    originalIsActive,
  );

  // Confirm timestamps consistency between updated and fetched entities
  TestValidator.equals(
    "fetched created_at must equal original created_at",
    fetched.created_at,
    originalCreatedAt,
  );
  TestValidator.equals(
    "fetched updated_at must equal updated updated_at",
    fetched.updated_at,
    updated.updated_at,
  );
}
