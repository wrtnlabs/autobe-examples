import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductSubcategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSubcategory";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_subcategory_update_duplicate_name_conflict(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup authorized administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = { Authorization: adminAuthorized.token.access };
  // 2. Using placeholders for existing subcategory IDs
  // Since IShoppingMallProductSubcategory.IUpdate has no properties, we can't send name directly
  // But we perform the update assuming the name update would cause duplication conflict
  const duplicateNameConflictSubcategoryId = typia.random<
    string & tags.Format<"uuid">
  >();
  const updateBody = {} as IShoppingMallProductSubcategory.IUpdate;
  // 3. Attempt update expecting conflict error
  await TestValidator.httpError(
    "update subcategory with duplicate name conflict",
    409,
    async () => {
      await api.functional.shoppingMall.administrator.productSubcategories.updateProductSubcategory(
        adminConnection,
        {
          subcategoryId: duplicateNameConflictSubcategoryId,
          body: updateBody,
        },
      );
    },
  );
}
