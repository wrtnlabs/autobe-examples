import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_subcategory_delete_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Create an admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Administrator join to obtain authorization token
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Generate random UUIDs for non-existent category and subcategory
  const nonExistentCategoryId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSubcategoryId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to delete the non-existent subcategory
  await TestValidator.httpError(
    "delete non-existent product subcategory returns 404 Not Found",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.product.categories.subcategories.eraseSubcategory(
        adminConnection,
        {
          categoryId: nonExistentCategoryId,
          subcategoryId: nonExistentSubcategoryId,
        },
      );
    },
  );
}
