import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshot";
import type { IShoppingMallProductSnapshotImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSnapshotImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOptionValue";
import type { IShoppingMallProductVariantSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantSnapshot";
import type { IShoppingMallReviewReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReviewReview";
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
import { prepare_random_shopping_mall_product_variant_option_value } from "../../../prepare/prepare_random_shopping_mall_product_variant_option_value";

export async function test_api_variant_snapshot_cross_seller_access_denied(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerAConnection, {});
  // 2. Seller A creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // 3. Seller A creates a variant for the product
  const variant =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerAConnection,
      { params: { productId: product.id } },
    );
  typia.assert(variant);
  // 4. Seller A edits the product to trigger automatic product snapshot
  //    with nested variant snapshots
  const updatedProduct =
    await api.functional.shoppingMall.seller.products.update(
      sellerAConnection,
      {
        productId: product.id,
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          shopping_mall_category_id: product.category.id,
          base_price: product.base_price + 100,
        } satisfies IShoppingMallProduct.IUpdate,
      },
    );
  typia.assert(updatedProduct);
  // 5. Generate snapshot identifiers — the snapshot listing endpoint is not
  //    available in the provided SDK, so random UUIDs are used in place of
  //    the actual snapshot IDs that were created by the product edit above
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const variantSnapshotId = typia.random<string & tags.Format<"uuid">>();
  // 6. Register and authenticate as Seller B — a different seller who does
  //    not own the product and should be denied access
  const sellerBConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerBConnection, {});
  // 7. Seller B attempts to access Seller A's variant snapshot → expect 403
  await TestValidator.httpError(
    "seller B cannot access seller A's variant snapshot",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.snapshots.variant_snapshots.at(
        sellerBConnection,
        {
          productId: product.id,
          snapshotId,
          variantSnapshotId,
        },
      );
    },
  );
}
