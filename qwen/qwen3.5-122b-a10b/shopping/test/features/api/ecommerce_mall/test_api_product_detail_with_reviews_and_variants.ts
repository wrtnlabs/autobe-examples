import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_admin_categories_create } from "../../../generate/generate_random_ecommerce_mall_admin_categories_create";
import { generate_random_ecommerce_mall_customer_orders_create } from "../../../generate/generate_random_ecommerce_mall_customer_orders_create";
import { generate_random_ecommerce_mall_customer_reviews_create } from "../../../generate/generate_random_ecommerce_mall_customer_reviews_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";

export async function test_api_product_detail_with_reviews_and_variants(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account for category management
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<
        string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">
      >(),
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 2. Login as admin
  const adminLoginConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminLoginConnection, {
    body: {
      email: adminAuth.email,
      password: adminPassword,
    } satisfies IEcommerceMallAdmin.ILogin,
  });
  // 3. Create category for product
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminLoginConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallCategory.ICreate,
    },
  );
  typia.assert(category);
  // 4. Create seller account
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: sellerPassword,
      shop_name: RandomGenerator.name(2),
      shop_description: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 5. Login as seller
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerAuth.seller.email,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 6. Create product
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerLoginConnection,
    {
      body: {
        name: RandomGenerator.name(3),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: category.id,
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 7. Create first variant (e.g., Small/Red)
  const variant1 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            { key: "color", value: "Red" },
            { key: "size", value: "Small" },
          ] satisfies IEcommerceMallProductVariantOption[],
          price: product.basePrice + 1000,
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant1);
  // 8. Create second variant (e.g., Large/Blue) with different price
  const variant2 =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerLoginConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphaNumeric(8)}`,
          optionValues: [
            { key: "color", value: "Blue" },
            { key: "size", value: "Large" },
          ] satisfies IEcommerceMallProductVariantOption[],
          price: product.basePrice - 500,
          stockQuantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10>
          >(),
        } satisfies IEcommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant2);
  // 9. Create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: customerPassword,
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 10. Login as customer
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerAuth.email,
      password: customerPassword,
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  // 11. Create order with the product variant (need delivered order for review)
  const order = await generate_random_ecommerce_mall_customer_orders_create(
    customerLoginConnection,
    {
      body: {
        shipping_recipient_name: RandomGenerator.name(2),
        shipping_phone_number: RandomGenerator.mobile(),
        shipping_street_address: `${RandomGenerator.alphabets(5)} Street`,
        shipping_city: RandomGenerator.name(1),
        shipping_state: RandomGenerator.name(1),
        shipping_postal_code: RandomGenerator.alphaNumeric(10),
        shipping_country: "South Korea",
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 12. Create first review
  const review1 = await generate_random_ecommerce_mall_customer_reviews_create(
    customerLoginConnection,
    {
      body: {
        order_item_id:
          order.order_items[0]?.id ??
          typia.random<string & tags.Format<"uuid">>(),
        product_id: product.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review1);
  // 13. Create second review with different rating
  const review2 = await generate_random_ecommerce_mall_customer_reviews_create(
    customerLoginConnection,
    {
      body: {
        order_item_id:
          order.order_items[1]?.id ??
          order.order_items[0]?.id ??
          typia.random<string & tags.Format<"uuid">>(),
        product_id: product.id,
        rating: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<5>
        >(),
        content: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IEcommerceMallReview.ICreate,
    },
  );
  typia.assert(review2);
  // 14. Retrieve product detail
  const productDetail = await api.functional.ecommerceMall.products.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(productDetail);
  // 15. Validate product detail includes all variants
  TestValidator.equals("variant count", productDetail.variants.length, 2);
  TestValidator.equals(
    "first variant exists",
    productDetail.variants.some((v) => v.id === variant1.id),
    true,
  );
  TestValidator.equals(
    "second variant exists",
    productDetail.variants.some((v) => v.id === variant2.id),
    true,
  );
  // 16. Validate variants have correct option values
  const v1 = productDetail.variants.find((v) => v.id === variant1.id);
  const v2 = productDetail.variants.find((v) => v.id === variant2.id);
  TestValidator.predicate(
    "variant1 has color option",
    v1?.optionValues?.color === "Red",
  );
  TestValidator.predicate(
    "variant1 has size option",
    v1?.optionValues?.size === "Small",
  );
  TestValidator.predicate(
    "variant2 has color option",
    v2?.optionValues?.color === "Blue",
  );
  TestValidator.predicate(
    "variant2 has size option",
    v2?.optionValues?.size === "Large",
  );
  // 17. Validate price overrides
  TestValidator.equals(
    "variant1 price override",
    v1?.price,
    product.basePrice + 1000,
  );
  TestValidator.equals(
    "variant2 price override",
    v2?.price,
    product.basePrice - 500,
  );
  // 18. Validate review count
  TestValidator.equals("review count", productDetail.reviewCount, 2);
  // 19. Validate average rating is calculated
  TestValidator.predicate(
    "average rating exists",
    productDetail.averageRating !== null &&
      productDetail.averageRating !== undefined,
  );
  TestValidator.predicate(
    "average rating in range",
    productDetail.averageRating !== null &&
      productDetail.averageRating !== undefined &&
      productDetail.averageRating >= 1 &&
      productDetail.averageRating <= 5,
  );
  // 20. Validate product images exist
  TestValidator.predicate(
    "product has images",
    productDetail.images.length > 0,
  );
}
