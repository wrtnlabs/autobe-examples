import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallSaleUnit } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSaleUnit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_sale_unit_retrieval_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of an existing sale unit by administrator.
  // Authenticate as an administrator using /auth/administrator/join.
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {} satisfies IShoppingMallAdministrator.IJoin,
  });
  // Use a random UUID to simulate a valid existing sale unit ID
  const validUnitId = typia.random<string & tags.Format<"uuid">>();
  // Call the GET /shoppingMall/administrator/sale-units/{unitId} endpoint.
  const saleUnit =
    await api.functional.shoppingMall.administrator.sale_units.at(
      adminConnection,
      {
        unitId: validUnitId,
      },
    );
  typia.assert(saleUnit);
  // Scenario 2: Attempt to retrieve a non-existent sale unit by administrator.
  const nonExistentUnitId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "Non-existent sale unit retrieval returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.administrator.sale_units.at(
        adminConnection,
        {
          unitId: nonExistentUnitId,
        },
      );
    },
  );
  // Scenario 3: Unauthorized access to sale unit retrieval.
  await TestValidator.httpError(
    "Unauthorized access returns 401",
    401,
    async () => {
      await api.functional.shoppingMall.administrator.sale_units.at(
        connection,
        {
          unitId: validUnitId,
        },
      );
    },
  );
}
