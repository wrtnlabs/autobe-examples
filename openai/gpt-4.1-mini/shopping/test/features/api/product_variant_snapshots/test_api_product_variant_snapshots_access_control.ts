import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductVariantSnapshot";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_product_variant_snapshots_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Prepare a connection with no authorization
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Try to call the productVariantSnapshots.index endpoint without any authorization
  await TestValidator.httpError(
    "reject unauthorized access without token",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.productVariantSnapshots.index(
        unauthorizedConnection,
        { body: {} },
      );
    },
  );
  // Prepare an administrator connection with authorization
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {},
  });
  // Call the endpoint with the authorized administrator
  const output =
    await api.functional.shoppingMall.administrator.productVariantSnapshots.index(
      adminConnection,
      {
        body: {},
      },
    );
  typia.assert(output);
  // Assert that output has pagination and data array
  TestValidator.predicate(
    "pagination exists",
    output.pagination !== null && typeof output.pagination === "object",
  );
  TestValidator.predicate("data is array", Array.isArray(output.data));
}
