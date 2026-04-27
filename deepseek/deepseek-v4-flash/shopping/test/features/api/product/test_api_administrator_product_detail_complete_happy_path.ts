import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
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

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_e_commerce_mall_administrator_categories_create } from "../../../generate/generate_random_e_commerce_mall_administrator_categories_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_images_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_images_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_administrator_product_detail_complete_happy_path(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin #1 joins and creates a category
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  const category =
    await generate_random_e_commerce_mall_administrator_categories_create(
      adminConnection,
      {},
    );
  typia.assert(category);
  // 2. Seller joins and creates a product with image and variants
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: "Test Shop",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(seller);
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: "Test Product",
        description: "Test product description",
        category_id: category.id,
        base_price: 10000,
      },
    },
  );
  typia.assert(product);
  // Upload image
  const image =
    await generate_random_e_commerce_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
      },
    );
  typia.assert(image);
  // Create variant #1: Red, Large (price null = inherit base_price)
  const variant1 =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-RED-LARGE",
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "Large" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant1);
  // Restock variant #1 with +100 units
  const inv1 =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: {
          quantity_change: 100,
          reason: "Initial restock",
        },
        params: { productId: product.id, variantId: variant1.id },
      },
    );
  typia.assert(inv1);
  // Create variant #2: Blue, Medium (price null = inherit base_price)
  const variant2 =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        body: {
          sku_code: "SKU-BLUE-MEDIUM",
          options: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Medium" },
          ],
        },
        params: { productId: product.id },
      },
    );
  typia.assert(variant2);
  // Restock variant #2 with +50 units
  const inv2 =
    await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
      sellerConnection,
      {
        body: {
          quantity_change: 50,
          reason: "Initial restock",
        },
        params: { productId: product.id, variantId: variant2.id },
      },
    );
  typia.assert(inv2);
  // 3. Admin #2 joins and retrieves the product detail
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2 = await authorize_administrator_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin2);
  const detail = await api.functional.eCommerceMall.administrator.products.at(
    admin2Connection,
    { productId: product.id },
  );
  typia.assert(detail);
  // 4. Validation
  TestValidator.equals("product id", detail.id, product.id);
  TestValidator.equals("product name", detail.name, product.name);
  TestValidator.equals(
    "product description",
    detail.description,
    product.description,
  );
  TestValidator.equals("base price", detail.base_price, product.base_price);
  TestValidator.equals("visibility", detail.visibility, "visible");
  TestValidator.equals(
    "seller shop name",
    detail.seller.profile.shop_name,
    seller.profile?.shopName ?? null,
  );
  TestValidator.equals("category name", detail.category?.name, category.name);
  TestValidator.equals(
    "category description",
    detail.category?.description,
    category.description,
  );
  TestValidator.predicate("images has 1 image", detail.images.length === 1);
  TestValidator.equals("image sort order", detail.images[0].sort_order, 0);
  TestValidator.equals("image url", detail.images[0].url, image.url);
  TestValidator.equals("variants count", detail.variants.length, 2);
  // Variant #1 validation: Red, Large, stock=100, price=null (inherited)
  const redLarge = detail.variants.find((v) => v.sku_code === "SKU-RED-LARGE");
  typia.assertGuard(redLarge!);
  TestValidator.equals(
    "variant #1 options",
    redLarge.options.map((o) => ({ key: o.key, value: o.value })),
    [
      { key: "color", value: "Red" },
      { key: "size", value: "Large" },
    ],
  );
  TestValidator.equals("variant #1 price", redLarge.price, null);
  TestValidator.equals("variant #1 stock", redLarge.stock, 100);
  // Variant #2 validation: Blue, Medium, stock=50, price=null (inherited)
  const blueMedium = detail.variants.find(
    (v) => v.sku_code === "SKU-BLUE-MEDIUM",
  );
  typia.assertGuard(blueMedium!);
  TestValidator.equals(
    "variant #2 options",
    blueMedium.options.map((o) => ({ key: o.key, value: o.value })),
    [
      { key: "color", value: "Blue" },
      { key: "size", value: "Medium" },
    ],
  );
  TestValidator.equals("variant #2 price", blueMedium.price, null);
  TestValidator.equals("variant #2 stock", blueMedium.stock, 50);
  // Reviews should be empty (no reviews written)
  TestValidator.equals("average rating", detail.average_rating, null);
  TestValidator.equals("review count", detail.review_count, 0);
  TestValidator.equals("reviews array length", detail.reviews.length, 0);
}
