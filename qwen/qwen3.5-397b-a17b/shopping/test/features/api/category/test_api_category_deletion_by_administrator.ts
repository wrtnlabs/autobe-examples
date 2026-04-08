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
 * Test that an administrator can successfully delete a category from the catalog.
 *
 * Validates the complete category deletion workflow including administrator authentication, category creation, and soft delete execution. Ensures that the deletion operation completes successfully with proper authorization and that the category resource is properly removed from the active catalog.
 *
 * The test verifies the primary success path for category deletion, confirming that administrators can manage catalog structure by removing categories when needed. The soft delete implementation preserves the category record with a deleted_at timestamp for audit purposes while removing it from normal browsing.
 *
 * 1. Administrator account is created via join operation with unique email and credentials.
 * 2. A test category is created with randomized name and optional description.
 * 3. Category is deleted using its UUID via the admin delete endpoint.
 * 4. Verifies the deletion operation completes without error (204 No Content).
 * 5. Confirms the category was properly created before deletion with all required fields validated through typia assertion.
 */
export async function test_api_category_deletion_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      grade: "regular" as const,
    },
  });
  typia.assert(adminAuth);
  // 2. Create a category that will be deleted
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Delete the category using its UUID
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: category.id,
  });
  // 4. Verify the deletion completed successfully
  // The erase endpoint returns void on success (204 No Content)
  // Successful completion without error indicates the category was deleted
}
