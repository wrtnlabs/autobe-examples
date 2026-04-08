import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdministrator";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_ecommerce_mall_administrator_categories_create } from "../../../generate/generate_random_ecommerce_mall_administrator_categories_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";

/**
 * Test category update workflow for basic fields including name, description, and sort order.
 *
 * Validates the complete category update flow by creating an administrator account, creating an initial category, updating it with new values, and verifying all changes are correctly persisted. This test ensures that category attributes can be modified successfully and that the updated_at timestamp is refreshed upon modification.
 *
 * The test validates that category name changes from 'Electronics' to 'Consumer Electronics', description updates from 'Electronic devices' to 'Consumer electronic products and gadgets', and sort_order changes from 1 to 5. It also confirms that core fields like id, creator_id, parent_id, and created_at remain unchanged while deleted_at stays NULL.
 *
 * 1. Administrator registers with email/password credentials via POST /auth/administrator/join
 * 2. Initial category created with name='Electronics', description='Electronic devices', sort_order=1
 * 3. Category updated via PUT /categories/{id} with new values for name, description, sort_order
 * 4. Response validated to confirm all updates persisted correctly
 */
export async function test_api_category_update_basic_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator registration
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      display_name: "Test Category Manager",
      email: "category.test@test.com",
      password: "password1234",
    } satisfies IEcommerceMallAdministrator.IJoin,
  });
  // 2. Create initial category with specific values
  const initialCategory: IEcommerceMallCategory =
    await api.functional.ecommerceMall.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: "Electronics",
          description: "Electronic devices",
          sort_order: 1,
        } satisfies IEcommerceMallCategory.ICreate,
      },
    );
  typia.assert(initialCategory);
  // 3. Update category with new values
  const updatedCategory: IEcommerceMallCategory =
    await api.functional.ecommerceMall.administrator.categories.putByCategoryid(
      adminConnection,
      {
        categoryId: initialCategory.id,
        body: {
          name: "Consumer Electronics",
          description: "Consumer electronic products and gadgets",
          sort_order: 5,
        } satisfies IEcommerceMallCategory.IUpdate,
      },
    );
  typia.assert(updatedCategory);
  // 4. Validate updated fields
  TestValidator.equals(
    "name updated",
    updatedCategory.name,
    "Consumer Electronics",
  );
  TestValidator.equals(
    "description updated",
    updatedCategory.description,
    "Consumer electronic products and gadgets",
  );
  TestValidator.equals("sort_order updated", updatedCategory.sort_order, 5);
  // 5. Validate unchanged fields
  TestValidator.equals("id unchanged", updatedCategory.id, initialCategory.id);
  TestValidator.equals(
    "creator_id unchanged",
    updatedCategory.creator_id,
    initialCategory.creator_id,
  );
  TestValidator.equals("parent_id unchanged", updatedCategory.parent_id, null);
  TestValidator.equals(
    "created_at unchanged",
    updatedCategory.created_at,
    initialCategory.created_at,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedCategory.updated_at,
    initialCategory.updated_at,
  );
  TestValidator.equals("deleted_at is NULL", updatedCategory.deleted_at, null);
}
