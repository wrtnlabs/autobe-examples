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

export async function test_api_inventory_record_detail_preserves_historical_stock_event_fields(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = {
    host: connection.host,
  };
  const administrator: IShoppingMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    });
  typia.assert(administrator);
  const inventoryRecord: IShoppingMallInventoryRecord =
    await api.functional.shoppingMall.administrator.products.variants.inventory_records.at(
      adminConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        inventoryRecordId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(inventoryRecord);
  TestValidator.predicate(
    "inventory record represents a concrete signed stock movement",
    inventoryRecord.quantity_change !== 0,
  );
  TestValidator.predicate(
    "inventory record preserves a non-empty business reason",
    inventoryRecord.reason.length > 0,
  );
  TestValidator.predicate(
    "inventory record preserves a ledger occurrence timestamp",
    inventoryRecord.occurred_at.length > 0,
  );
  TestValidator.predicate(
    "inventory record nests a concrete variant identifier",
    inventoryRecord.productVariant.id.length > 0,
  );
  TestValidator.predicate(
    "inventory record variant summary preserves sku code",
    inventoryRecord.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "inventory record variant summary preserves option summary",
    inventoryRecord.productVariant.option_summary.length > 0,
  );
}
