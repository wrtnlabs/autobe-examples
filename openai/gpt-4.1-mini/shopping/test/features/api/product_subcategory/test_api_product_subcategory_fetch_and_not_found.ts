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

export async function test_api_product_subcategory_fetch_and_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Authenticate as administrator and fetch existing subcategory
  const adminConnection: api.IConnection = { host: connection.host };
  // Prepare administrator join data - as the join DTO type is empty, we generate an empty object
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Set bearer token
  adminConnection.headers = {
    Authorization: `Bearer ${authorized.token.access}`,
  };

  // Scenario 2: Fetch product subcategory by non-existent UUID
  const nonExistentUUID = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "fetch non-existent product subcategory",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.productSubcategories.at(
        adminConnection,
        { subcategoryId: nonExistentUUID },
      );
    },
  );
}
