import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallProductSnapshot";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSessions";
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
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_product_snapshot_history_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and approve seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    shop_name: RandomGenerator.name(),
    shop_description: RandomGenerator.paragraph({ sentences: 2 }),
    logo_image_url: null,
  } satisfies IShoppingMallSeller.IJoin;
  const joined: IShoppingMallSeller.IAuthorized =
    await api.functional.shoppingMall.auth.seller.join(sellerConnection, {
      body: sellerCredentials,
    });
  typia.assert(joined);
  // Update connection with new token
  sellerConnection.headers = { Authorization: joined.token.access };
  // 2. Login seller
  const loginOutput: IShoppingMallSeller.IAuthorized =
    await api.functional.shoppingMall.auth.seller.login(sellerConnection, {
      body: {
        email: sellerCredentials.email,
        password: sellerCredentials.password,
      } satisfies IShoppingMallSeller.ILogin,
    });
  typia.assert(loginOutput);
  // 3. Get a category for product creation
  // Use random category ID since categories API doesn't exist
  const categoryId = typia.random<string & tags.Format<"uuid">>();
  // 4. Create a product
  const createdProduct: IShoppingMallProduct =
    await api.functional.shoppingMall.seller.products.create(sellerConnection, {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.content({ paragraphs: 2 }),
        shopping_mall_category_id: categoryId,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.MultipleOf<100>
        >(),
        images: [
          {
            image_url: typia.random<string & tags.Format<"uri">>(),
            sort_order: 0,
          } satisfies IShoppingMallProductImage.ICreate,
        ],
        variants: [
          {
            sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
            option_values: [
              {
                option_name: "color",
                option_value: RandomGenerator.pick(["red", "blue", "green"]),
              } satisfies IShoppingMallProductVariantOptionValue.ICreate,
            ],
            stock_quantity: 10,
          } satisfies IShoppingMallProductVariant.ICreate,
        ],
      } satisfies IShoppingMallProduct.ICreate,
    });
  typia.assert(createdProduct);
  // 5. Edit the product multiple times to create snapshots
  const editCount = 3;
  for (let i = 0; i < editCount; i++) {
    const updateProduct: IShoppingMallProduct =
      await api.functional.shoppingMall.seller.products.update(
        sellerConnection,
        {
          productId: createdProduct.id,
          body: {
            name: `${createdProduct.name} (Edit ${i + 1})`,
            description: createdProduct.description,
            base_price: (createdProduct.base_price +
              100 * (i + 1)) satisfies number,
          } satisfies IShoppingMallProduct.IUpdate,
        },
      );
    typia.assert(updateProduct);
  }
  // 6. Retrieve snapshot history
  const snapshotHistory: IPageIShoppingMallProductSnapshot.ISummary =
    await api.functional.shoppingMall.seller.products.snapshots.at(
      sellerConnection,
      {
        productId: createdProduct.id,
      },
    );
  typia.assert(snapshotHistory);
  // 7. Validate snapshot history
  // Should have initial create + editCount updates = editCount + 1 snapshots
  TestValidator.equals(
    "snapshot count matches expected",
    snapshotHistory.data.length,
    editCount + 1,
  );
  // Validate snapshot order (reverse chronological - newest first)
  for (let i = 0; i < snapshotHistory.data.length - 1; i++) {
    const current = snapshotHistory.data[i];
    const next = snapshotHistory.data[i + 1];
    // Newer snapshot should have higher version
    TestValidator.equals(
      `snapshot version ${i} > ${i + 1}`,
      current.snapshot_version,
      next.snapshot_version + 1,
    );
  }
  // Validate snapshot content
  const latestSnapshot = snapshotHistory.data[0];
  TestValidator.equals(
    "latest snapshot version is 1",
    latestSnapshot.snapshot_version,
    1,
  );
  TestValidator.equals(
    "latest snapshot name matches product name",
    latestSnapshot.name,
    `${createdProduct.name} (Edit ${editCount})`,
  );
  TestValidator.equals(
    "latest snapshot price matches final price",
    latestSnapshot.base_price,
    createdProduct.base_price,
  );
  TestValidator.equals(
    "latest snapshot is_deleted matches product",
    latestSnapshot.is_deleted,
    createdProduct.is_deleted,
  );
  // Validate snapshot metadata
  // Use direct validation instead of predicate with parameter
  const timestampValid = !isNaN(
    new Date(latestSnapshot.snapshot_timestamp).getTime(),
  );
  TestValidator.predicate("snapshot has valid timestamp", timestampValid);
  // Validate originalProduct reference
  TestValidator.equals(
    "snapshot references original product",
    latestSnapshot.originalProduct.id,
    createdProduct.id,
  );
  // Validate seller reference
  TestValidator.equals(
    "snapshot seller matches creating seller",
    latestSnapshot.seller.id,
    loginOutput.data.profile.id,
  );
  // Validate category reference
  TestValidator.equals(
    "snapshot category matches created category",
    latestSnapshot.category.id,
    categoryId,
  );
}
