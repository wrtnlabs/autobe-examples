import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariantOption";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_products_images_create";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

export async function test_api_product_image_reorder_ownership_check(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Register Seller A (product owner)
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `SellerA_${RandomGenerator.alphabets(8)}`,
    },
  });
  typia.assert(sellerA);
  // Setup: Register Seller B (unauthorized accessor)
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: `SellerB_${RandomGenerator.alphabets(8)}`,
    },
  });
  typia.assert(sellerB);
  // Setup: Register admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Setup: Admin approves both sellers
  const approvedSellerA =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerA.id,
    });
  typia.assert(approvedSellerA);
  const approvedSellerB =
    await api.functional.shoppingMall.admin.sellers.approve(adminConnection, {
      sellerId: sellerB.id,
    });
  typia.assert(approvedSellerB);
  // Setup: Seller A creates a product
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerAConnection,
    {},
  );
  typia.assert(product);
  // Setup: Seller A uploads two images to the product
  const image1 =
    await generate_random_shopping_mall_seller_sellers_me_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_sellers_me_products_images_create(
      sellerAConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image2);
  // Test: Seller B attempts to reorder images of Seller A's product
  // Should return HTTP 403 Forbidden since Seller B doesn't own the product
  await TestValidator.httpError(
    "Seller B cannot reorder images of Seller A's product",
    403,
    async () => {
      await api.functional.shoppingMall.seller.products.images.reorder(
        sellerBConnection,
        {
          productId: product.id,
          body: {
            images: [image2.id, image1.id],
          } satisfies IShoppingMallProductImage.IOrder,
        },
      );
    },
  );
}
