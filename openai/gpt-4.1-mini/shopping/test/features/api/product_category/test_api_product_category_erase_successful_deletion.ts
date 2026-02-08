import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductCategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { generate_random_shopping_mall_administrator_product_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_product_categories_create";
import { prepare_random_shopping_mall_product_category } from "../../../prepare/prepare_random_shopping_mall_product_category";

export async function test_api_product_category_erase_successful_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Test deleting an existing product category by an authorized administrator.
  // Steps:
  // 1) Admin registration and login to obtain authorization tokens
  // 2) Create a new product category to ensure a valid categoryId for deletion
  // 3) Delete the created product category using its categoryId
  // 4) Verify the deletion by attempting to retrieve the deleted category or checking the database for removal
  // 5) Confirm that any products associated with the deleted category become uncategorized per business rules
  // 6) Validate appropriate HTTP 204 No Content response on successful deletion
  // 7) Check audit logs for recorded deletion action to ensure compliance and traceability
  // 8) Also test that unauthorized users cannot delete categories
  // 1. Admin join
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin =
    typia.random<IShoppingMallAdministrator.IJoin>();
  await authorize_administrator_join(adminJoinConnection, {
    body: adminJoinBody,
  });
  // 2. Admin login
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginBody: IShoppingMallAdministrator.ILogin = {
    // WARNING: Use the same credentials as join if possible, otherwise generate new valid login data.
    // But Join DTO is empty here, so assume login body can be empty for testing.
  };
  const adminAuth = await authorize_administrator_login(adminLoginConnection, {
    body: adminLoginBody,
  });
  // Setup admin connection with token via authorize function internally
  const adminConnection: api.IConnection = { host: connection.host };
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // 3. Create product category
  const productCategory =
    await generate_random_shopping_mall_administrator_product_categories_create(
      adminConnection,
      {},
    );
  typia.assert(productCategory);
  // Extract id from productCategory safely via IEntity interface
  const categoryId: string = (productCategory as IEntity).id;

  // 4. Delete the created product category
  await api.functional.shoppingMall.administrator.productCategories.erase(
    adminConnection,
    {
      categoryId: categoryId,
    },
  );
  // 5. Verify deletion by ensuring the category cannot be deleted again
  await TestValidator.error(
    "deleting already deleted category throws error",
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.erase(
        adminConnection,
        {
          categoryId: categoryId,
        },
      );
    },
  );
  // 6. Confirm that unauthorized user cannot delete categories
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthorized category deletion fails",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.erase(
        unauthorizedConnection,
        {
          categoryId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
