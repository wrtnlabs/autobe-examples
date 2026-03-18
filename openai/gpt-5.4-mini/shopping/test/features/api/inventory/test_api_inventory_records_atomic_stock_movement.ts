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

export async function test_api_inventory_records_atomic_stock_movement(
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
  const quantityChange = 1 as number & tags.Type<"int32">;
  const reason = `inventory adjustment ${RandomGenerator.alphabets(8)}`;
  const occurredAt = new Date().toISOString();
  const page =
    await api.functional.shoppingMall.administrator.productVariants.inventoryRecords.index(
      adminConnection,
      {
        productVariantId,
        body: {
          quantityChange,
          reason,
          occurredAt,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(page);
  TestValidator.predicate(
    "inventory history page should contain at least one record",
    page.data.length >= 1,
  );
  const created = page.data[0];
  TestValidator.equals(
    "recorded quantity change should match request",
    created.quantityChange,
    quantityChange,
  );
  TestValidator.equals(
    "recorded reason should match request",
    created.reason,
    reason,
  );
  TestValidator.equals(
    "recorded occurredAt should match request",
    created.occurredAt,
    occurredAt,
  );
  TestValidator.equals(
    "recorded variant id should match request",
    created.productVariant.id,
    productVariantId,
  );
}
