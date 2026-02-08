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

export async function test_api_product_category_administrator_retrieve_valid_id(
  connection: api.IConnection,
): Promise<void> {
  // Administrator registration and authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  adminConnection.headers = {
    ...adminConnection.headers,
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Create a valid category ID to test retrieval
  const validCategoryId = typia.random<string & tags.Format<"uuid">>();
  // Test valid retrieval of a product category by ID
  const category =
    await api.functional.shoppingMall.administrator.productCategories.at(
      adminConnection,
      {
        categoryId: validCategoryId,
      },
    );
  // Assert full response type validation
  typia.assert(category);
  // Removed validation of non-existent properties to fix compilation errors
  // Test retrieval of a non-existent categoryId returns 404 error
  await TestValidator.httpError(
    "should return 404 for non-existent category",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productCategories.at(
        adminConnection,
        {
          categoryId: "00000000-0000-0000-0000-000000000000" satisfies string &
            tags.Format<"uuid">,
        },
      );
    },
  );
}
