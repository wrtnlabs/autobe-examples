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

export async function test_api_inventory_record_detail_administrator_reads_variant_ledger_entry(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = {
    host: connection.host,
  };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  const inventoryRecord =
    await api.functional.shoppingMall.administrator.products.variants.inventory_records.at(
      administratorConnection,
      {
        productId: typia.random<string & tags.Format<"uuid">>(),
        variantId: typia.random<string & tags.Format<"uuid">>(),
        inventoryRecordId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert<IShoppingMallInventoryRecord>(inventoryRecord);
  TestValidator.predicate(
    "inventory record reason is non-empty",
    inventoryRecord.reason.length > 0,
  );
  TestValidator.predicate(
    "product variant sku code is non-empty",
    inventoryRecord.productVariant.sku_code.length > 0,
  );
  TestValidator.predicate(
    "product variant option summary is non-empty",
    inventoryRecord.productVariant.option_summary.length > 0,
  );
  const snapshot = JSON.parse(
    JSON.stringify(inventoryRecord),
  ) as IShoppingMallInventoryRecord;
  TestValidator.equals(
    "read-only retrieval preserves response metadata snapshot",
    inventoryRecord,
    snapshot,
  );
}
