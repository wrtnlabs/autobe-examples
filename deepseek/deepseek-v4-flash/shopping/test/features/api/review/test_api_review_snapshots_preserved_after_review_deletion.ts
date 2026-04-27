import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallAdministrator";
import type { IECommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequest";
import type { IECommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCancellationRequestSnapshot";
import type { IECommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCartItem";
import type { IECommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCategory";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerAddress";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallInventoryRecord";
import type { IECommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrder";
import type { IECommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItem";
import type { IECommerceMallOrderItemSellerSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSellerSnapshot";
import type { IECommerceMallOrderItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemSnapshot";
import type { IECommerceMallOrderItemStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallOrderItemStatusLog";
import type { IECommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProduct";
import type { IECommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductImage";
import type { IECommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariant";
import type { IECommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallProductVariantOption";
import type { IECommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequest";
import type { IECommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallRefundRequestSnapshot";
import type { IECommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReview";
import type { IECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallReviewSnapshot";
import type { IECommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSeller";
import type { IECommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSellerProfile";
import type { IECommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipment";
import type { IECommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallShipmentItem";
import type { IECommerceMallSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIECommerceMallReviewSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIECommerceMallReviewSnapshot";
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
import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_customer_reviews_create } from "../../../generate/generate_random_e_commerce_mall_customer_reviews_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_review_snapshots_preserved_after_review_deletion(
  connection: api.IConnection,
): Promise<void> {
  // Create isolated connections for each actor
  const superAdminConnection: api.IConnection = { host: connection.host };
  const sellerConnection: api.IConnection = { host: connection.host };
  const customerConnection: api.IConnection = { host: connection.host };
  // 1. Authenticate super administrator (via login - pre-seeded account)
  await authorize_super_administrator_login(superAdminConnection, {
    body: {
      email: "admin@test.com",
      password: "admin",
      href: "https://example.com/login",
      referrer: "https://example.com/",
    } satisfies IECommerceMallSuperAdministrator.ILogin,
  });
  // 2. Seller signs up
  const sellerAuth = await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // 3. Create product with category_id = null (no category needed)
  const product = await api.functional.eCommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: null,
        base_price: typia.random<
          number & tags.Minimum<1000> & tags.Maximum<100000>
        >(),
      } satisfies IECommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Create variant with options
  const variant =
    await api.functional.eCommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(16),
          price: null,
          options: [
            { key: "color", value: "Red" },
            { key: "size", value: "M" },
          ] satisfies [
            IECommerceMallProductVariant.IOption,
            IECommerceMallProductVariant.IOption,
          ],
        } satisfies IECommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // 5. Add inventory (restock)
  const quantity = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
  >();
  const inventory =
    await api.functional.eCommerceMall.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity_change: quantity,
          reason: "Initial restock for testing",
        } satisfies IECommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventory);
  // 6. Customer signs up
  const customerAuth = await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // 7. Create shipping address
  const address = await api.functional.eCommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.alphabets(20),
        city: RandomGenerator.alphabets(8),
        state_province: RandomGenerator.alphabets(8),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
      } satisfies IECommerceMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // 8. Add variant to cart
  const cartItem =
    await api.functional.eCommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<3>
          >(),
        } satisfies IECommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // 9. Place order
  const order = await api.functional.eCommerceMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      } satisfies IECommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // Get the order item ID for later use
  const orderItemId = order.orderItems[0].id;
  // 10. Seller creates shipment for the order item
  const shipment = await api.functional.eCommerceMall.seller.shipments.create(
    sellerConnection,
    {
      body: {
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        orderItemIds: [orderItemId],
      } satisfies IECommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // 11. Customer confirms delivery
  const confirmedShipment =
    await api.functional.eCommerceMall.customer.shipments.update(
      customerConnection,
      {
        shipmentId: shipment.id,
        body: {} satisfies IECommerceMallShipment.IUpdate,
      },
    );
  typia.assert(confirmedShipment);
  // 12. Customer writes a review (rating=4, text='Great product')
  //     This creates an initial 'created' snapshot automatically
  const review = await api.functional.eCommerceMall.customer.reviews.create(
    customerConnection,
    {
      body: {
        order_item_id: orderItemId,
        rating: 4,
        content: "Great product",
      } satisfies IECommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  // 13. Customer edits review — changes both rating and text
  //     This creates a 'rating_and_text' snapshot before applying the edit
  const updatedReview =
    await api.functional.eCommerceMall.customer.reviews.update(
      customerConnection,
      {
        reviewId: review.id,
        body: {
          rating: 3,
          content: "Average product",
        } satisfies IECommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  // 14. Customer deletes review (soft-delete)
  //     Snapshots are preserved and remain accessible to administrators
  await api.functional.eCommerceMall.customer.reviews.erase(
    customerConnection,
    {
      reviewId: review.id,
    },
  );
  // 15. Super administrator retrieves review snapshots
  //     Snapshots should still be accessible even though the review is deleted
  const snapshotPage =
    await api.functional.eCommerceMall.superAdministrator.reviews.snapshots.index(
      superAdminConnection,
      {
        reviewId: review.id,
        body: {} satisfies IECommerceMallReviewSnapshot.IRequest,
      },
    );
  typia.assert(snapshotPage);
  // Validate pagination: exactly 2 snapshots
  TestValidator.equals(
    "snapshot records count",
    snapshotPage.pagination.records,
    2,
  );
  // Validate first (newest) snapshot — created by the edit action
  // changed_fields='rating_and_text' because both rating and text were modified
  // rating=4 and text='Great product' are the BEFORE-edit values (what was preserved)
  const firstSnapshot = snapshotPage.data[0];
  TestValidator.equals(
    "first snapshot changed_fields",
    firstSnapshot.changed_fields,
    "rating_and_text",
  );
  TestValidator.equals(
    "first snapshot rating (before edit)",
    firstSnapshot.rating,
    4,
  );
  TestValidator.equals(
    "first snapshot text (before edit)",
    firstSnapshot.text,
    "Great product",
  );
  // Validate second (oldest) snapshot — created at review creation time
  // changed_fields='created' for the initial state
  // rating=4 and text='Great product' are the initial values
  const secondSnapshot = snapshotPage.data[1];
  TestValidator.equals(
    "second snapshot changed_fields",
    secondSnapshot.changed_fields,
    "created",
  );
  TestValidator.equals(
    "second snapshot rating (initial)",
    secondSnapshot.rating,
    4,
  );
  TestValidator.equals(
    "second snapshot text (initial)",
    secondSnapshot.text,
    "Great product",
  );
}
