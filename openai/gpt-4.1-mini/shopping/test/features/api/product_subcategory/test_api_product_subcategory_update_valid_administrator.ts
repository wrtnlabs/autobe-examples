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

export async function test_api_product_subcategory_update_valid_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Administrator join to get the authorization token
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody: IShoppingMallAdministrator.IJoin = {};
  const adminAuthorized = await authorize_administrator_join(adminConnection, {
    body: adminJoinBody,
  });
  // Inject Authorization header with admin token
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // 2. Prepare a valid update body
  const updateBody: IShoppingMallProductSubcategory.IUpdate =
    typia.random<IShoppingMallProductSubcategory.IUpdate>();
  // 3. Create a random UUID for subcategoryId to simulate existing subcategory
  // In real scenario we should create a subcategory first, but per instructions,
  // we simulate with random UUID
  const subcategoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call the update API endpoint
  const updatedSubcategory =
    await api.functional.shoppingMall.administrator.productSubcategories.updateProductSubcategory(
      adminConnection,
      {
        subcategoryId,
        body: updateBody,
      },
    );
  typia.assert(updatedSubcategory);
  // 5. Validate the update succeeded by asserting returned value is not null
  TestValidator.predicate(
    "updated subcategory is valid",
    updatedSubcategory !== null && updatedSubcategory !== undefined,
  );
  // 6. Try unauthorized update with base connection (no auth)
  await TestValidator.error("unauthorized update should fail", async () => {
    await api.functional.shoppingMall.administrator.productSubcategories.updateProductSubcategory(
      connection,
      {
        subcategoryId,
        body: updateBody,
      },
    );
  });
}
