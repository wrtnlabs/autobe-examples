import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
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

export async function test_api_inventory_records_stock_safeguard(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IShoppingMallAdministrator.IJoin,
  });
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    quantityChange: -1,
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    occurredAt: new Date().toISOString(),
  } satisfies IShoppingMallInventoryRecord.IRequest;
  await TestValidator.httpError(
    "administrator inventory record patch should reject unsafe stock movement",
    [400, 409, 422],
    async () => {
      await api.functional.shoppingMall.administrator.productVariants.inventoryRecords.index(
        adminConnection,
        {
          productVariantId,
          body,
        },
      );
    },
  );
  await TestValidator.httpError(
    "administrator inventory record patch should remain rejected on повтор attempt",
    [400, 409, 422],
    async () => {
      await api.functional.shoppingMall.administrator.productVariants.inventoryRecords.index(
        adminConnection,
        {
          productVariantId,
          body,
        },
      );
    },
  );
}
