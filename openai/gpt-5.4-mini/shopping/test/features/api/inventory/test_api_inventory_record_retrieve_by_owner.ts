import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_inventory_record_retrieve_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerBody = {
    email: `${RandomGenerator.alphabets(8)}@test.com`,
    password: RandomGenerator.alphaNumeric(12),
  } satisfies IShoppingMallSeller.IJoin;
  const authorized = await authorize_seller_join(sellerConnection, {
    body: sellerBody,
  });
  typia.assert(authorized);
  const productVariantId = typia.random<string & tags.Format<"uuid">>();
  const inventoryRecordId = typia.random<string & tags.Format<"uuid">>();
  const retrieved =
    await api.functional.shoppingMall.seller.productVariants.inventoryRecords.at(
      sellerConnection,
      {
        productVariantId,
        inventoryRecordId,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals(
    "requested variant scope is reflected in payload",
    retrieved.productVariant.id,
    productVariantId,
  );
  TestValidator.equals(
    "requested inventory record id is reflected in payload",
    retrieved.id,
    inventoryRecordId,
  );
  TestValidator.predicate(
    "quantity change is signed integer",
    Number.isInteger(retrieved.quantityChange),
  );
  TestValidator.predicate("reason is non-empty", retrieved.reason.length > 0);
  TestValidator.predicate(
    "occurredAt is not later than createdAt",
    new Date(retrieved.occurredAt).getTime() <=
      new Date(retrieved.createdAt).getTime(),
  );
  TestValidator.predicate(
    "createdAt is not later than updatedAt",
    new Date(retrieved.createdAt).getTime() <=
      new Date(retrieved.updatedAt).getTime(),
  );
}
