import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAddress";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCartItem";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCheckout } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCheckout";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallInventoryRecord";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductImage";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallRefundRequest";
import type { IShoppingMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallReview";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShipment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";
import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_shopping_mall_administrator_categories_create } from "../../../generate/generate_random_shopping_mall_administrator_categories_create";
import { generate_random_shopping_mall_customer_addresses_create } from "../../../generate/generate_random_shopping_mall_customer_addresses_create";
import { generate_random_shopping_mall_customer_cart_items_create } from "../../../generate/generate_random_shopping_mall_customer_cart_items_create";
import { generate_random_shopping_mall_customer_checkout_create } from "../../../generate/generate_random_shopping_mall_customer_checkout_create";
import { generate_random_shopping_mall_customer_reviews_create } from "../../../generate/generate_random_shopping_mall_customer_reviews_create";
import { generate_random_shopping_mall_seller_products_create } from "../../../generate/generate_random_shopping_mall_seller_products_create";
import { generate_random_shopping_mall_seller_products_images_create } from "../../../generate/generate_random_shopping_mall_seller_products_images_create";
import { generate_random_shopping_mall_seller_products_variants_create } from "../../../generate/generate_random_shopping_mall_seller_products_variants_create";
import { generate_random_shopping_mall_seller_shipments_create } from "../../../generate/generate_random_shopping_mall_seller_shipments_create";
import { generate_random_shopping_mall_seller_variants_inventory_records_create } from "../../../generate/generate_random_shopping_mall_seller_variants_inventory_records_create";
import { prepare_random_shopping_mall_address } from "../../../prepare/prepare_random_shopping_mall_address";
import { prepare_random_shopping_mall_cart_item } from "../../../prepare/prepare_random_shopping_mall_cart_item";
import { prepare_random_shopping_mall_category } from "../../../prepare/prepare_random_shopping_mall_category";
import { prepare_random_shopping_mall_checkout } from "../../../prepare/prepare_random_shopping_mall_checkout";
import { prepare_random_shopping_mall_inventory_record } from "../../../prepare/prepare_random_shopping_mall_inventory_record";
import { prepare_random_shopping_mall_product } from "../../../prepare/prepare_random_shopping_mall_product";
import { prepare_random_shopping_mall_product_image } from "../../../prepare/prepare_random_shopping_mall_product_image";
import { prepare_random_shopping_mall_product_variant } from "../../../prepare/prepare_random_shopping_mall_product_variant";
import { prepare_random_shopping_mall_review } from "../../../prepare/prepare_random_shopping_mall_review";
import { prepare_random_shopping_mall_shipment } from "../../../prepare/prepare_random_shopping_mall_shipment";

export async function test_api_product_detail_view_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create administrator and category hierarchy
  const adminConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: { password: adminPassword },
  });
  typia.assert(adminAuth);
  const parentCategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      { body: { name: `Parent-${RandomGenerator.alphabets(8)}` } },
    );
  typia.assert(parentCategory);
  const subcategory =
    await generate_random_shopping_mall_administrator_categories_create(
      adminConnection,
      {
        body: {
          name: `Subcategory-${RandomGenerator.alphabets(8)}`,
          parent_id: parentCategory.id,
        },
      },
    );
  typia.assert(subcategory);
  // 2. Create seller with shop profile
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      shop_name: `TestShop-${RandomGenerator.alphabets(6)}`,
      shop_description: RandomGenerator.paragraph({ sentences: 3 }),
      logo_image: "https://example.com/logo.png",
    },
  });
  typia.assert(sellerAuth);
  // 3. Create product assigned to subcategory
  const product = await generate_random_shopping_mall_seller_products_create(
    sellerConnection,
    {
      body: {
        name: `TestProduct-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 5 }),
        basePrice: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
        categoryId: subcategory.id,
      },
    },
  );
  typia.assert(product);
  // 4. Upload multiple product images with different display_order
  const image1 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: "https://example.com/image1.jpg",
          display_order: 0,
        },
      },
    );
  typia.assert(image1);
  const image2 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: "https://example.com/image2.jpg",
          display_order: 1,
        },
      },
    );
  typia.assert(image2);
  const image3 =
    await generate_random_shopping_mall_seller_products_images_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          image_url: "https://example.com/image3.jpg",
          display_order: 2,
        },
      },
    );
  typia.assert(image3);
  // 5. Create multiple product variants with different option values
  const variant1 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(8)}-RED-L`,
          optionValues: { color: "Red", size: "Large" },
          price: null,
        },
      },
    );
  typia.assert(variant1);
  const variant2 =
    await generate_random_shopping_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: `SKU-${RandomGenerator.alphabets(8)}-BLU-M`,
          optionValues: { color: "Blue", size: "Medium" },
          price: product.base_price + 1000,
        },
      },
    );
  typia.assert(variant2);
  // 6. Add inventory records to set stock quantities
  const inventory1 =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant1.id },
        body: {
          quantity_change: 50,
          reason: "Initial stock from supplier",
        },
      },
    );
  typia.assert(inventory1);
  const inventory2 =
    await generate_random_shopping_mall_seller_variants_inventory_records_create(
      sellerConnection,
      {
        params: { variantId: variant2.id },
        body: {
          quantity_change: 30,
          reason: "Initial stock from supplier",
        },
      },
    );
  typia.assert(inventory2);
  // 7. Create first customer account
  const customer1Connection: api.IConnection = { host: connection.host };
  const customer1Auth = await authorize_customer_join(customer1Connection, {
    body: {
      displayName: `Customer1-${RandomGenerator.alphabets(4)}`,
    },
  });
  typia.assert(customer1Auth);
  // 8. Create customer address
  const address1 =
    await generate_random_shopping_mall_customer_addresses_create(
      customer1Connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: "123 Test Street",
          city: "Test City",
          state_province: "Test State",
          postal_code: "12345",
          country: "Test Country",
          is_default: true,
        },
      },
    );
  typia.assert(address1);
  // 9. Add to cart and checkout for customer 1
  const cartItem1 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customer1Connection,
      {
        body: {
          variant_id: variant1.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem1);
  const order1 = await generate_random_shopping_mall_customer_checkout_create(
    customer1Connection,
    { body: { address_id: address1.id } },
  );
  typia.assert(order1);
  // 10. Create second customer account
  const customer2Connection: api.IConnection = { host: connection.host };
  const customer2Auth = await authorize_customer_join(customer2Connection, {
    body: {
      displayName: `Customer2-${RandomGenerator.alphabets(4)}`,
    },
  });
  typia.assert(customer2Auth);
  // Create address for customer 2
  const address2 =
    await generate_random_shopping_mall_customer_addresses_create(
      customer2Connection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: "456 Test Avenue",
          city: "Test City 2",
          state_province: "Test State 2",
          postal_code: "67890",
          country: "Test Country 2",
          is_default: true,
        },
      },
    );
  typia.assert(address2);
  // Add to cart and checkout for customer 2
  const cartItem2 =
    await generate_random_shopping_mall_customer_cart_items_create(
      customer2Connection,
      {
        body: {
          variant_id: variant2.id,
          quantity: 2,
        },
      },
    );
  typia.assert(cartItem2);
  const order2 = await generate_random_shopping_mall_customer_checkout_create(
    customer2Connection,
    { body: { address_id: address2.id } },
  );
  typia.assert(order2);
  // 11. Seller creates shipments (using order IDs and variant IDs as order item identifiers)
  const shipment1 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order1.id,
        order_item_ids: [cartItem1.id],
        carrier_name: "Test Carrier",
        tracking_number: `TRACK-${RandomGenerator.alphabets(12)}`,
      },
    },
  );
  typia.assert(shipment1);
  const shipment2 = await generate_random_shopping_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        order_id: order2.id,
        order_item_ids: [cartItem2.id],
        carrier_name: "Test Carrier",
        tracking_number: `TRACK-${RandomGenerator.alphabets(12)}`,
      },
    },
  );
  typia.assert(shipment2);
  // 12. Customers confirm delivery
  await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
    customer1Connection,
    { shipmentId: shipment1.id },
  );
  await api.functional.shoppingMall.customer.shipments.delivery.confirmDelivery(
    customer2Connection,
    { shipmentId: shipment2.id },
  );
  // 13. Customers submit reviews
  const review1 = await generate_random_shopping_mall_customer_reviews_create(
    customer1Connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order1.id,
        rating: 5,
        content: "Excellent product!",
      },
    },
  );
  typia.assert(review1);
  const review2 = await generate_random_shopping_mall_customer_reviews_create(
    customer2Connection,
    {
      body: {
        shopping_mall_product_id: product.id,
        shopping_mall_order_id: order2.id,
        rating: 4,
        content: "Good product, fast delivery.",
      },
    },
  );
  typia.assert(review2);
  // 14. Get product detail and verify
  const productDetail = await api.functional.shoppingMall.products.at(
    connection,
    {
      productId: product.id,
    },
  );
  typia.assert(productDetail);
  // Verify basic product fields
  TestValidator.equals("product id matches", productDetail.id, product.id);
  TestValidator.equals(
    "product name matches",
    productDetail.name,
    product.name,
  );
  TestValidator.equals(
    "product description matches",
    productDetail.description,
    product.description,
  );
  TestValidator.equals(
    "product base_price matches",
    productDetail.base_price,
    product.base_price,
  );
  // Verify seller summary
  TestValidator.predicate(
    "seller has id",
    productDetail.seller.id !== undefined,
  );
  TestValidator.predicate(
    "seller has shop_name",
    productDetail.seller.shop_name !== undefined,
  );
  // Verify category hierarchy
  TestValidator.equals(
    "category id matches",
    productDetail.category.id,
    subcategory.id,
  );
  TestValidator.predicate(
    "category has parent",
    productDetail.category.parent !== null,
  );
  TestValidator.equals(
    "parent category id matches",
    productDetail.category.parent?.id,
    parentCategory.id,
  );
  // Verify images sorted by display_order ascending
  TestValidator.equals("images count", productDetail.images.length, 3);
  TestValidator.predicate(
    "images sorted by display_order",
    productDetail.images[0].display_order <=
      productDetail.images[1].display_order &&
      productDetail.images[1].display_order <=
        productDetail.images[2].display_order,
  );
  TestValidator.equals(
    "first image display_order",
    productDetail.images[0].display_order,
    0,
  );
  TestValidator.equals(
    "second image display_order",
    productDetail.images[1].display_order,
    1,
  );
  TestValidator.equals(
    "third image display_order",
    productDetail.images[2].display_order,
    2,
  );
  // Verify variants with calculated stock_quantity
  TestValidator.equals("variants count", productDetail.variants.length, 2);
  const variant1Detail = productDetail.variants.find(
    (v) => v.id === variant1.id,
  );
  const variant2Detail = productDetail.variants.find(
    (v) => v.id === variant2.id,
  );
  TestValidator.predicate("variant1 found", variant1Detail !== undefined);
  TestValidator.predicate("variant2 found", variant2Detail !== undefined);
  // Verify stock_quantity is a valid non-negative number
  TestValidator.predicate(
    "variant1 stock_quantity is non-negative",
    variant1Detail !== undefined && variant1Detail.stock_quantity >= 0,
  );
  TestValidator.predicate(
    "variant2 stock_quantity is non-negative",
    variant2Detail !== undefined && variant2Detail.stock_quantity >= 0,
  );
  // Verify review statistics
  TestValidator.predicate(
    "average_rating exists",
    productDetail.average_rating !== null,
  );
  TestValidator.predicate(
    "average_rating between 1.0-5.0",
    productDetail.average_rating !== null &&
      productDetail.average_rating >= 1.0 &&
      productDetail.average_rating <= 5.0,
  );
  TestValidator.equals(
    "total_review_count",
    productDetail.total_review_count,
    2,
  );
}
