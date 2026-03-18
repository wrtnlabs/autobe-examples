import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_stock_integrity_and_ownership(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_seller_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "password1234",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(ownerAuthorized);
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuthorized = await authorize_seller_join(intruderConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@example.com`,
      password: "password1234",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(intruderAuthorized);
  const productId = typia.random<string & tags.Format<"uuid">>();
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      ownerConnection,
      {
        params: { productId },
        body: {
          skuCode: RandomGenerator.alphaNumeric(12),
          overridePrice: null,
          stockQuantity: 10,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const updatedHistory =
    await api.functional.shoppingMall.seller.productVariants.inventoryRecords.index(
      ownerConnection,
      {
        productVariantId: variant.id,
        body: {
          quantityChange: -3,
          reason: "Initial stock adjustment",
          occurredAt: new Date().toISOString(),
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(updatedHistory);
  TestValidator.predicate(
    "owner inventory history includes the recorded stock movement",
    updatedHistory.data.some(
      (record) =>
        record.productVariant.id === variant.id &&
        record.quantityChange === -3 &&
        record.reason === "Initial stock adjustment",
    ),
  );
  await TestValidator.error(
    "other seller should not mutate or read another seller's inventory history",
    async () => {
      await api.functional.shoppingMall.seller.productVariants.inventoryRecords.index(
        intruderConnection,
        {
          productVariantId: variant.id,
          body: {
            quantityChange: -1,
            reason: "Unauthorized stock change attempt",
            occurredAt: new Date().toISOString(),
          } satisfies IShoppingMallInventoryRecord.IRequest,
        },
      );
    },
  );
}
