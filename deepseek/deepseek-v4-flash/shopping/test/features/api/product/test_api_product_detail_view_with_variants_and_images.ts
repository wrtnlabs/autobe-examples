import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_images_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_images_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

/**
 * Test that a customer can view the complete product detail page for a fully configured product with variants, inventory, and images.
 *
 * Sets up a seller account, creates a product with a variant, adds inventory and an image, then authenticates as a customer and retrieves the product detail. Validates all product fields, seller info, image data, variant data with stock, and review metadata are correctly returned.
 *
 * 1. Join as seller with random credentials and shop profile.
 * 2. Create a product using the seller's authenticated session.
 * 3. Create a variant with options under the product.
 * 4. Add inventory to the variant to make it purchasable.
 * 5. Upload a product image that serves as the thumbnail.
 * 6. Join as a customer with random credentials.
 * 7. Retrieve the product detail as the customer.
 * 8. Validate the response: product fields, seller shop name, image URL and sort_order, variant SKU and stock, average_rating null, review_count 0, empty reviews array, timestamps present.
 */
export async function test_api_product_detail_view_with_variants_and_images(
  connection: api.IConnection,
): Promise<void> {
  // 1. Seller setup
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 2. Create product (without category since category creation API is unavailable)
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  typia.assert(product);
  // 3. Create variant
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(variant);
  // 4. Add inventory with positive quantity to ensure stock > 0
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        quantity_change: 100,
        reason: "initial stock",
      },
    },
  );
  // 5. Upload product image
  const image =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image);
  // 6. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 7. Retrieve product detail as customer
  const detail = await api.functional.eCommerceMall.customer.products.at(
    customerConnection,
    { productId: product.id },
  );
  typia.assert(detail);
  // 8. Validate product fields
  TestValidator.equals("product id", detail.id, product.id);
  TestValidator.equals("product name", detail.name, product.name);
  TestValidator.equals(
    "product description",
    detail.description,
    product.description,
  );
  TestValidator.equals("base price", detail.base_price, product.base_price);
  TestValidator.equals("visibility is visible", detail.visibility, "visible");
  // Validate seller shop name
  TestValidator.equals(
    "seller shop name",
    detail.seller.profile.shop_name,
    sellerAuth.profile!.shopName,
  );
  // Validate images
  TestValidator.equals("images count", detail.images.length, 1);
  TestValidator.equals("image url", detail.images[0].url, image.url);
  TestValidator.equals(
    "thumbnail sort_order is 0",
    detail.images[0].sort_order,
    0,
  );
  // Validate variants
  TestValidator.equals("variants count", detail.variants.length, 1);
  TestValidator.equals(
    "variant sku code",
    detail.variants[0].sku_code,
    variant.sku_code,
  );
  TestValidator.predicate(
    "variant has positive stock",
    detail.variants[0].stock > 0,
  );
  TestValidator.predicate(
    "variant has at least one option",
    detail.variants[0].options.length >= 1,
  );
  TestValidator.predicate(
    "variant option has key and value",
    detail.variants[0].options.every(
      (opt) => typeof opt.key === "string" && typeof opt.value === "string",
    ),
  );
  // Validate reviews metadata
  TestValidator.equals("average rating is null", detail.average_rating, null);
  TestValidator.equals("review count is 0", detail.review_count, 0);
  TestValidator.equals("reviews array empty", detail.reviews.length, 0);
  // Validate timestamps
  TestValidator.predicate(
    "created_at is present",
    typeof detail.created_at === "string" && detail.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at is present",
    typeof detail.updated_at === "string" && detail.updated_at.length > 0,
  );
}
