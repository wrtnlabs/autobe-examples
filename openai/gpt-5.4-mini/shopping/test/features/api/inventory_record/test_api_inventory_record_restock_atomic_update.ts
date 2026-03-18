import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallInventoryRecord";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";

export async function test_api_inventory_record_restock_atomic_update(
  connection: api.IConnection,
): Promise<void> {
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1>
        >(),
      } satisfies IShoppingMallProduct.ICreate,
    },
  );
  typia.assert(product);
  const initialStock = 0 as number & tags.Type<"int32">;
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(8)}`,
          overridePrice: null,
          stockQuantity: initialStock,
        } satisfies IShoppingMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  const restockQuantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<20>
  >();
  const reason = `restock-${RandomGenerator.alphabets(6)}`;
  const occurredAt = new Date().toISOString();
  const before =
    await api.functional.shoppingMall.seller.productVariants.inventoryRecords.index(
      sellerConnection,
      {
        productVariantId: variant.id,
        body: {
          page: 1,
          limit: 100,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(before);
  const after =
    await api.functional.shoppingMall.seller.productVariants.inventoryRecords.index(
      sellerConnection,
      {
        productVariantId: variant.id,
        body: {
          quantityChange: restockQuantity,
          reason,
          occurredAt,
        } satisfies IShoppingMallInventoryRecord.IRequest,
      },
    );
  typia.assert(after);
  TestValidator.predicate(
    "inventory history should include at least one record after restock",
    after.data.length >= before.data.length + 1,
  );
  const createdRecord = after.data[0];
  TestValidator.equals(
    "recorded restock quantity",
    createdRecord.quantityChange,
    restockQuantity,
  );
  TestValidator.equals("recorded restock reason", createdRecord.reason, reason);
  TestValidator.equals(
    "recorded restock occurredAt",
    createdRecord.occurredAt,
    occurredAt,
  );
  TestValidator.equals(
    "recorded restock variant id",
    createdRecord.productVariant.id,
    variant.id,
  );
  TestValidator.equals(
    "recorded restock stock quantity is increased atomically",
    createdRecord.productVariant.stockQuantity,
    initialStock + restockQuantity,
  );
  TestValidator.equals(
    "current stock after restock should match the returned inventory snapshot",
    createdRecord.productVariant.stockQuantity,
    variant.stockQuantity + restockQuantity,
  );
  if (before.data.length > 0) {
    TestValidator.notEquals(
      "new history record should be distinct from prior immutable records",
      createdRecord.id,
      before.data[0].id,
    );
  }
}
