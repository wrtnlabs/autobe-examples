import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotSku";
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
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";

export async function test_api_product_snapshot_owner_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller connection and authenticate
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
    },
  });
  typia.assert(seller);
  // 2. Create a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Capture original product state before update
  const originalName = product.name;
  const originalDescription = product.description;
  const originalBasePrice = product.base_price;
  // 4. Update product to trigger snapshot creation
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(sellerConnection, {
      productId: product.id,
      body: {
        name: originalName + " Updated",
        description:
          originalDescription +
          " " +
          RandomGenerator.paragraph({ sentences: 2 }),
        base_price: originalBasePrice + 100,
      } satisfies IShoppingMallProduct.IUpdate,
    });
  typia.assert(updatedProduct);
  // 5. Validate product was updated successfully
  TestValidator.equals("product id preserved", updatedProduct.id, product.id);
  TestValidator.notEquals(
    "name was updated",
    updatedProduct.name,
    originalName,
  );
  TestValidator.notEquals(
    "description was updated",
    updatedProduct.description,
    originalDescription,
  );
  TestValidator.notEquals(
    "base_price was updated",
    updatedProduct.base_price,
    originalBasePrice,
  );
  // 6. The update operation creates a snapshot automatically
  // Retrieve the snapshot using the snapshot endpoint
  // Note: In a real system, snapshotId would be obtained from a list endpoint
  // or embedded in the update response. Here we demonstrate the endpoint usage.
  const snapshot =
    await api.functional.shoppingMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: product.id,
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(snapshot);
  // 7. Validate snapshot contains pre-update state
  TestValidator.equals(
    "snapshot id matches",
    snapshot.id,
    typia.random<string & tags.Format<"uuid">>(),
  );
  TestValidator.equals(
    "snapshot product reference",
    snapshot.product.id,
    product.id,
  );
  TestValidator.equals("snapshot name preserved", snapshot.name, originalName);
  TestValidator.equals(
    "snapshot description preserved",
    snapshot.description,
    originalDescription,
  );
  TestValidator.equals(
    "snapshot basePrice preserved",
    snapshot.basePrice,
    originalBasePrice,
  );
}
