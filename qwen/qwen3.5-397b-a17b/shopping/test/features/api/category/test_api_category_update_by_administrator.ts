import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";

/**
 * Test successful category update operation by an administrator.
 *
 * Validates the complete category update workflow including administrator authentication, category creation, and update operations. Ensures that the update endpoint correctly modifies the category's name and description while preserving immutable fields like created_at and id.
 *
 * The test covers three update scenarios to verify partial and complete updates: updating name only, description only, and both fields together. Each scenario validates that the response contains the complete category entity with appropriate field changes and timestamp updates.
 *
 * 1. Administrator authenticates via join endpoint to obtain admin credentials.
 * 2. Creates a top-level category with initial name and description.
 * 3. Updates the category name only and validates the response.
 * 4. Updates the category description only and validates the response.
 * 5. Updates both name and description together and validates the response.
 * 6. Verifies that created_at remains unchanged throughout all updates.
 * 7. Verifies that updated_at changes with each update operation.
 */
export async function test_api_category_update_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // 2. Create initial category
  const initialCategory: IShoppingMallCategory =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {},
    );
  typia.assert(initialCategory);
  // Store original timestamps for validation
  const originalCreatedAt = initialCategory.createdAt;
  const originalUpdatedAt = initialCategory.updatedAt;
  // 3. Update name only
  const nameUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies IShoppingMallCategory.IUpdate;
  const nameUpdatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: initialCategory.id,
      body: nameUpdateBody,
    });
  typia.assert(nameUpdatedCategory);
  // Validate name update
  TestValidator.equals(
    "name matches update",
    nameUpdatedCategory.name,
    nameUpdateBody.name,
  );
  TestValidator.equals(
    "description unchanged",
    nameUpdatedCategory.description,
    initialCategory.description,
  );
  TestValidator.equals(
    "id unchanged",
    nameUpdatedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "created_at preserved",
    nameUpdatedCategory.createdAt,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    nameUpdatedCategory.updatedAt,
    originalUpdatedAt,
  );
  // 4. Update description only
  const descriptionUpdateBody = {
    description: RandomGenerator.content({ paragraphs: 2 }),
  } satisfies IShoppingMallCategory.IUpdate;
  const descriptionUpdatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: nameUpdatedCategory.id,
      body: descriptionUpdateBody,
    });
  typia.assert(descriptionUpdatedCategory);
  // Validate description update
  TestValidator.equals(
    "name preserved",
    descriptionUpdatedCategory.name,
    nameUpdatedCategory.name,
  );
  TestValidator.equals(
    "description matches update",
    descriptionUpdatedCategory.description,
    descriptionUpdateBody.description,
  );
  TestValidator.equals(
    "id unchanged",
    descriptionUpdatedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "created_at preserved",
    descriptionUpdatedCategory.createdAt,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed again",
    descriptionUpdatedCategory.updatedAt,
    nameUpdatedCategory.updatedAt,
  );
  // 5. Update both name and description
  const bothUpdateBody = {
    name: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 3 }),
  } satisfies IShoppingMallCategory.IUpdate;
  const bothUpdatedCategory: IShoppingMallCategory =
    await api.functional.shoppingMall.admin.categories.update(adminConnection, {
      categoryId: descriptionUpdatedCategory.id,
      body: bothUpdateBody,
    });
  typia.assert(bothUpdatedCategory);
  // Validate both fields update
  TestValidator.equals(
    "name matches final update",
    bothUpdatedCategory.name,
    bothUpdateBody.name,
  );
  TestValidator.equals(
    "description matches final update",
    bothUpdatedCategory.description,
    bothUpdateBody.description,
  );
  TestValidator.equals(
    "id unchanged throughout",
    bothUpdatedCategory.id,
    initialCategory.id,
  );
  TestValidator.equals(
    "created_at preserved throughout",
    bothUpdatedCategory.createdAt,
    originalCreatedAt,
  );
  TestValidator.notEquals(
    "updated_at changed for final update",
    bothUpdatedCategory.updatedAt,
    descriptionUpdatedCategory.updatedAt,
  );
}
