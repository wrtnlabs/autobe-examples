import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_inventory_record_administrator_only_access(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const inventoryRecordId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "administrator inventory record access should be denied for unprivileged connection",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.administrator.productVariants.inventoryRecords.at(
        unauthenticatedConnection,
        {
          productVariantId,
          inventoryRecordId,
        },
      ),
  );
  await TestValidator.httpError(
    "administrator inventory record access should be denied for anonymous connection",
    [401, 403],
    async () =>
      await api.functional.shoppingMall.administrator.productVariants.inventoryRecords.at(
        { host: connection.host },
        {
          productVariantId,
          inventoryRecordId,
        },
      ),
  );
}
