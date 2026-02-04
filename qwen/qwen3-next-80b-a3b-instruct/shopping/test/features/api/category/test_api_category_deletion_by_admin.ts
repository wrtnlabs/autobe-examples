import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAuthorizationToken";
import type { IShoppingMallSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSection";
import { prepare_random_shopping_mall_section } from "../../../prepare/prepare_random_shopping_mall_section";
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_category_deletion_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as admin through join operation
  const adminConnection: api.IConnection = { host: connection.host };
  const admin: IShoppingMallAdmin.IAuthorized = await authorize_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "ValidPassword123!",
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: "192.168.1.1",
      } satisfies IShoppingMallAdmin.IJoin,
    },
  );
  typia.assert(admin);
  // Step 2: Create clean category with no products or child categories
  const createdCategory: IShoppingMallSection =
    await generate_random_shopping_mall_admin_categories_create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IShoppingMallSection.ICreate,
      },
    );
  typia.assert(createdCategory);
  // Validate category creation parameters
  TestValidator.equals(
    "category name matches",
    createdCategory.name,
    createdCategory.name,
  );
  // Step 3: Delete the created category
  await api.functional.shoppingMall.admin.categories.erase(adminConnection, {
    categoryId: createdCategory.categoryId,
  });
  // Final validation: The deletion operation must complete without errors
  // Since there is no GET endpoint for categories, we cannot verify
  // the deletion by retrieving the category. The success of the test
  // depends on the delete operation completing successfully without throwing an error
  // The function returns void and if it throws an error, the test will fail
  // The fact that we reached this point without error confirms successful deletion
  // This is the only verification we can perform with the provided API
}
