import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerApproval";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerSuspension } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerSuspension";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_ecommerce_mall_admin_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_admin_categories_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_create";
import { generate_random_ecommerce_mall_seller_sellers_me_products_images_create } from "../../../generate/generate_random_ecommerce_mall_seller_sellers_me_products_images_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";

export async function test_api_product_image_multiple_uploads_display_order(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and login as seller with stored credentials
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: "https://example.com",
      referrer: "https://example.com",
    },
  });
  // 2. Admin creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  const category =
    await generate_random_ecommerce_mall_admin_admin_categories_create(
      adminConnection,
      {},
    );
  // 3. Seller creates a product
  const product =
    await generate_random_ecommerce_mall_seller_sellers_me_products_create(
      sellerConnection,
      {
        body: { categoryId: category.id },
      },
    );
  // 4. Upload 3 images sequentially
  const image1 =
    await api.functional.ecommerceMall.seller.sellers.me.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
        },
      },
    );
  const image2 =
    await api.functional.ecommerceMall.seller.sellers.me.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
        },
      },
    );
  const image3 =
    await api.functional.ecommerceMall.seller.sellers.me.products.images.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          imageUrl: `https://example.com/images/${RandomGenerator.alphaNumeric(16)}.jpg`,
        },
      },
    );
  // 5. Validate sequential display_order
  typia.assert(image1);
  typia.assert(image2);
  typia.assert(image3);
  TestValidator.equals(
    "first image display_order is 0",
    image1.displayOrder,
    0,
  );
  TestValidator.equals(
    "second image display_order is 1",
    image2.displayOrder,
    1,
  );
  TestValidator.equals(
    "third image display_order is 2",
    image3.displayOrder,
    2,
  );
  // 6. Validate image properties
  TestValidator.predicate(
    "image IDs are unique",
    image1.id !== image2.id && image2.id !== image3.id,
  );
  TestValidator.equals(
    "image1 belongs to the product",
    image1.product.id,
    product.id,
  );
  TestValidator.equals(
    "image2 belongs to the product",
    image2.product.id,
    product.id,
  );
  TestValidator.equals(
    "image3 belongs to the product",
    image3.product.id,
    product.id,
  );
}
