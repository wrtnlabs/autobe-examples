import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallInventoryHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryHistory";
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
import { generate_random_shopping_mall_seller_inventory_histories_create_inventory_history } from "../../../generate/generate_random_shopping_mall_seller_inventory_histories_create_inventory_history";
import { prepare_random_shopping_mall_inventory_history } from "../../../prepare/prepare_random_shopping_mall_inventory_history";

export async function test_api_seller_inventory_history_create_subtract_stock(
  connection: api.IConnection,
): Promise<void> {
  // Test creating an inventory history record with stock subtraction
  // 1. Seller joins and obtains authorized connection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      shopName: RandomGenerator.name(2),
      shopDescription: null,
      logoUri: null,
    },
  });
  typia.assert(sellerAuthorized);
  const sellerConnection: api.IConnection = { host: connection.host };
  sellerConnection.headers = {
    Authorization: sellerAuthorized.token.access,
  };
  // 2. Prepare a random inventory history with negative quantity delta (subtraction)
  // quantityDelta is negative to represent stock subtraction
  const subtractReason =
    RandomGenerator.paragraph({ sentences: 1 }) || "stock subtraction";
  const preparedInventoryHistory = {
    shoppingMallProductVariantId: typia.random<string & tags.Format<"uuid">>(),
    quantityDelta: -typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    reason: subtractReason,
  } satisfies IShoppingMallInventoryHistory.ICreate;
  // 3. Create inventory history record for stock subtraction
  const inventoryHistory =
    await generate_random_shopping_mall_seller_inventory_histories_create_inventory_history(
      sellerConnection,
      { body: preparedInventoryHistory },
    );
  typia.assert(inventoryHistory);
  // 4. Validate response: check negative quantityDelta, timestamps, and variant association
  TestValidator.predicate(
    "quantity delta is negative",
    inventoryHistory.quantityDelta < 0,
  );
  TestValidator.equals(
    "reason matches",
    inventoryHistory.reason,
    preparedInventoryHistory.reason,
  );
  TestValidator.equals(
    "product variant ID matches",
    inventoryHistory.shoppingMallProductVariantId,
    preparedInventoryHistory.shoppingMallProductVariantId,
  );
  TestValidator.predicate(
    "createdAt is valid datetime",
    typeof inventoryHistory.createdAt === "string" &&
      inventoryHistory.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt is valid datetime",
    typeof inventoryHistory.updatedAt === "string" &&
      inventoryHistory.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "deletedAt is null or datetime string",
    inventoryHistory.deletedAt === null ||
      typeof inventoryHistory.deletedAt === "string",
  );
  TestValidator.predicate(
    "productVariant.id is valid UUID",
    typeof inventoryHistory.productVariant.id === "string" &&
      /^[0-9a-fA-F-]{36}$/.test(inventoryHistory.productVariant.id),
  );
  TestValidator.equals(
    "productVariant.id matches shoppingMallProductVariantId",
    inventoryHistory.productVariant.id,
    inventoryHistory.shoppingMallProductVariantId,
  );
  TestValidator.predicate(
    "productVariant.skuCode is non-empty string",
    typeof inventoryHistory.productVariant.skuCode === "string" &&
      inventoryHistory.productVariant.skuCode.length > 0,
  );
  TestValidator.predicate(
    "productVariant.stockQuantity is a number",
    typeof inventoryHistory.productVariant.stockQuantity === "number",
  );
  TestValidator.predicate(
    "productVariant.createdAt is valid datetime",
    typeof inventoryHistory.productVariant.createdAt === "string" &&
      inventoryHistory.productVariant.createdAt.length > 0,
  );
  TestValidator.predicate(
    "productVariant.updatedAt is valid datetime",
    typeof inventoryHistory.productVariant.updatedAt === "string" &&
      inventoryHistory.productVariant.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "productVariant.deletedAt is null or datetime string",
    inventoryHistory.productVariant.deletedAt === null ||
      typeof inventoryHistory.productVariant.deletedAt === "string",
  );
}
