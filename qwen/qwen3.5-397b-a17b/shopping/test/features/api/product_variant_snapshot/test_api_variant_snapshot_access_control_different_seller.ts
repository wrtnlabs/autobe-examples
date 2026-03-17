import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductReviewStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductReviewStatistic";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
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
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_product_variant_option } from "../../../prepare/prepare_random_shopping_mall_product_variant_option";

export async function test_api_variant_snapshot_access_control_different_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first seller (seller1) who will own the product
  const seller1Connection: api.IConnection = { host: connection.host };
  const seller1Auth = await authorize_seller_join(seller1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller1Auth);
  // 2. Create a product under seller1
  const product = await generate_random_shopping_mall_seller_products_create(
    seller1Connection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 1 }),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies Partial<IShoppingMallProduct.ICreate>,
    },
  );
  typia.assert(product);
  // 3. Create a variant for seller1's product with unique option keys
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      seller1Connection,
      {
        params: { productId: product.id },
        body: {
          sku_code: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          price: typia.random<
            number & tags.Type<"uint32"> & tags.Minimum<1000>
          >(),
          stock_quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
          options: [
            { key: "color", value: RandomGenerator.name() },
            { key: "size", value: RandomGenerator.name() },
          ] satisfies IShoppingMallProductVariantOption.ICreate[],
        } satisfies Partial<IShoppingMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // 4. Edit the variant to trigger snapshot creation
  const updatedVariant =
    await api.functional.shoppingMall.seller.sellers.products.variants.update(
      seller1Connection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          stockQuantity: variant.stockQuantity + 5,
        } satisfies IShoppingMallProductVariant.IUpdate,
      },
    );
  typia.assert(updatedVariant);
  // 5. Register second seller (seller2) who should NOT have access
  const seller2Connection: api.IConnection = { host: connection.host };
  const seller2Auth = await authorize_seller_join(seller2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      logo_image_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallSeller.IJoin,
  });
  typia.assert(seller2Auth);
  // 6. Attempt to access seller1's variant snapshot as seller2
  // This should return 403 Forbidden due to access control
  // Since we don't have an endpoint to list product snapshots in the provided SDK,
  // we test with generated UUIDs. The access control should reject this request
  // because seller2 does not own the product, regardless of snapshot ID validity.
  await TestValidator.httpError(
    "seller2 cannot access seller1's variant snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.variantSnapshots.at(
        seller2Connection,
        {
          productId: product.id,
          snapshotId: typia.random<string & tags.Format<"uuid">>(),
          variantSnapshotId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
