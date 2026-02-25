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
import { generate_random_shopping_mall_admin_categories_create } from "../../../generate/generate_random_shopping_mall_admin_categories_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_sellers_me_products_images_create";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";

/**
 * Test automatic order assignment when uploading product images.
 *
 * This test validates that when images are uploaded without specifying
 * explicit order values, the system automatically assigns sequential
 * order values starting from 1.
 *
 * Test Steps:
 * 1. Create seller account and authenticate
 * 2. Create a category as administrator
 * 3. Create a product owned by the seller (product has no existing images)
 * 4. Upload 3 images WITHOUT providing order values in the request
 * 5. Verify the images receive auto-assigned sequential order values (1, 2, 3)
 * 6. Verify order values are positive integers with minimum value 1
 * 7. Verify each response is in IShoppingMallProductImage.ISummary format
 */
export async function test_api_product_image_upload_auto_order_assignment(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(sellerAuth);
  // 2. Create admin and category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category = await generate_random_shopping_mall_admin_categories_create(
    adminConnection,
    {},
  );
  typia.assert(category);
  // 3. Create product (seller must be approved)
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
        base_price: typia.random<
          number &
            tags.Type<"uint32"> &
            tags.Minimum<1000> &
            tags.Maximum<100000>
        >(),
        category_id: category.id,
      },
    },
  );
  typia.assert(product);
  // 4. Upload 3 images without order values (auto-assignment should occur)
  const image1 =
    await api.functional.shoppingMall.seller.sellers.me.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          // order is omitted - system should auto-assign
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image1);
  const image2 =
    await api.functional.shoppingMall.seller.sellers.me.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          // order is omitted - system should auto-assign
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image2);
  const image3 =
    await api.functional.shoppingMall.seller.sellers.me.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          url: typia.random<string & tags.Format<"uri">>(),
          // order is omitted - system should auto-assign
        } satisfies IShoppingMallProductImage.ICreate,
      },
    );
  typia.assert(image3);
  // 5. Validate auto-assigned sequential order values (1, 2, 3)
  const orderValues = [image1.order, image2.order, image3.order];
  const sortedOrders = [...orderValues].sort((a, b) => a - b);
  TestValidator.equals("sequential order values", sortedOrders, [1, 2, 3]);
  // 6. Validate order values are positive integers with minimum 1
  TestValidator.predicate("first image order is 1", image1.order === 1);
  TestValidator.predicate("second image order is 2", image2.order === 2);
  TestValidator.predicate("third image order is 3", image3.order === 3);
  // 7. Validate response format - all fields exist and are valid
  TestValidator.predicate(
    "image1 has valid id",
    typia.is<string & tags.Format<"uuid">>(image1.id),
  );
  TestValidator.predicate(
    "image1 has valid url",
    typia.is<string & tags.Format<"uri">>(image1.url),
  );
  TestValidator.predicate(
    "image1 has valid created_at",
    typia.is<string & tags.Format<"date-time">>(image1.created_at),
  );
}
