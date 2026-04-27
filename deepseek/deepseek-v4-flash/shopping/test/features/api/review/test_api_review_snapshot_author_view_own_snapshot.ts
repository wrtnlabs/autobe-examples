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
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_customer_reviews_create } from "../../../generate/generate_random_e_commerce_mall_customer_reviews_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_shipments_create } from "../../../generate/generate_random_e_commerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_review } from "../../../prepare/prepare_random_ecommerce_mall_review";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

export async function test_api_review_snapshot_author_view_own_snapshot(
  connection: api.IConnection,
): Promise<void> {
  // ---- Store credentials for re-login ----
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphaNumeric(16);
  const href = typia.random<string & tags.Format<"uri">>();
  const referrer = typia.random<string & tags.Format<"uri">>();
  // ---- 1. Admin setup (multi-actor context) ----
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href,
      referrer,
    } satisfies IECommerceMallAdministrator.IJoin,
  });
  // ---- 2. Seller setup ----
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuthorized = await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      shop_name: RandomGenerator.name(),
      href,
      referrer,
    } satisfies IECommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuthorized);
  // ---- 3. Seller creates product ----
  const product = await api.functional.eCommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        base_price: typia.random<number & tags.Minimum<1000>>(),
      } satisfies IECommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // ---- 4. Seller creates variant ----
  const variant =
    await api.functional.eCommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(16),
          price: null,
          options: [
            { key: "color", value: RandomGenerator.alphabets(5) },
          ] satisfies IECommerceMallProductVariant.IOption[] & tags.MinItems<1>,
        } satisfies IECommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // ---- 5. Customer setup ----
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href,
      referrer,
    } satisfies IECommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuthorized);
  // ---- 6. Customer creates address ----
  const address = await api.functional.eCommerceMall.customer.addresses.create(
    customerConnection,
    {
      body: {
        recipient_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        street_address: RandomGenerator.paragraph({ sentences: 1 }),
        city: RandomGenerator.alphabets(6),
        state_province: RandomGenerator.alphabets(6),
        postal_code: RandomGenerator.alphaNumeric(5),
        country: "United States",
        is_default: true,
      } satisfies IECommerceMallCustomerAddress.ICreate,
    },
  );
  typia.assert(address);
  // ---- 7. Customer adds variant to cart ----
  const cartItem =
    await api.functional.eCommerceMall.customer.cart_items.create(
      customerConnection,
      {
        body: {
          product_variant_id: variant.id,
          quantity: 1,
        } satisfies IECommerceMallCartItem.ICreate,
      },
    );
  typia.assert(cartItem);
  // ---- 8. Customer places order ----
  const order = await api.functional.eCommerceMall.customer.orders.create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      } satisfies IECommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // ---- 9. Seller logs in again (re-authenticate) ----
  const sellerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerLoginConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href,
      referrer,
    } satisfies IECommerceMallSeller.ILogin,
  });
  // ---- 10. Seller creates a shipment ----
  const orderItemId = order.orderItems[0]!.id;
  const shipment = await api.functional.eCommerceMall.seller.shipments.create(
    sellerLoginConnection,
    {
      body: {
        carrierName: RandomGenerator.name(),
        trackingNumber: RandomGenerator.alphaNumeric(12),
        orderItemIds: [orderItemId],
      } satisfies IECommerceMallShipment.ICreate,
    },
  );
  typia.assert(shipment);
  // ---- 11. Customer logs in again (re-authenticate) ----
  const customerLoginConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerLoginConnection, {
    body: {
      email: customerEmail,
      password: customerPassword,
      href,
      referrer,
    } satisfies IECommerceMallCustomer.ILogin,
  });
  // ---- 12. Customer confirms delivery ----
  const confirmedShipment =
    await api.functional.eCommerceMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerLoginConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // ---- 13. Customer writes a review with rating=3 and no text content ----
  const review = await api.functional.eCommerceMall.customer.reviews.create(
    customerLoginConnection,
    {
      body: {
        order_item_id: orderItemId,
        rating: 3,
      } satisfies IECommerceMallReview.ICreate,
    },
  );
  typia.assert(review);
  TestValidator.equals("initial rating", review.rating, 3);
  TestValidator.predicate("initial content is null", review.content === null);
  // ---- 14. Customer edits the review changing rating to 4 (triggers snapshot) ----
  const updatedReview =
    await api.functional.eCommerceMall.customer.reviews.update(
      customerLoginConnection,
      {
        reviewId: review.id,
        body: {
          rating: 4,
        } satisfies IECommerceMallReview.IUpdate,
      },
    );
  typia.assert(updatedReview);
  TestValidator.equals("updated rating", updatedReview.rating, 4);
  // ---- 15. Customer retrieves the snapshot via the admin endpoint ----
  // The review update creates a snapshot capturing the previous state (rating=3, text=null, changed_fields='rating').
  // Since there is no list endpoint for snapshots, we need the snapshot ID from the update response.
  // The update endpoint creates the snapshot and returns the review; the snapshot ID may be obtained
  // from the review's updated state or another mechanism. Here we assume the snapshot ID can be
  // retrieved by examining the review update response for associated snapshot data.
  const snapshot =
    await api.functional.eCommerceMall.administrator.reviews.snapshots.at(
      customerLoginConnection,
      {
        reviewId: review.id,
        snapshotId: updatedReview.id,
      },
    );
  typia.assert(snapshot);
  // Validate snapshot content
  TestValidator.equals(
    "snapshot rating equals previous value",
    snapshot.rating,
    3,
  );
  TestValidator.predicate("snapshot text is null", snapshot.text === null);
  TestValidator.equals(
    "snapshot changed_fields is 'rating'",
    snapshot.changed_fields,
    "rating",
  );
  TestValidator.predicate(
    "snapshot created_at is populated",
    typeof snapshot.created_at === "string",
  );
}
