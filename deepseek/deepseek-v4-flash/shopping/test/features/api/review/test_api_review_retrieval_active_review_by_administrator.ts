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

export async function test_api_review_retrieval_active_review_by_administrator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: IECommerceMallAdministrator.IAuthorized =
    await authorize_administrator_join(adminConnection, {
      body: typia.random<IECommerceMallAdministrator.IJoin>(),
    });
  typia.assert(adminAuth);
  // Step 2: Create customer (review author)
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth: IECommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerConnection, {});
  typia.assert(customerAuth);
  // Step 3: Create seller with shop
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IECommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerConnection, {});
  typia.assert(sellerAuth);
  // Step 4: Seller creates a product
  const product: IECommerceMallProduct =
    await api.functional.eCommerceMall.seller.products.create(
      sellerConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
          base_price: typia.random<
            number & tags.Minimum<1000> & tags.Maximum<100000>
          >(),
        } satisfies IECommerceMallProduct.ICreate,
      },
    );
  typia.assert(product);
  // Step 5: Seller creates a variant under the product
  const variant: IECommerceMallProductVariant =
    await api.functional.eCommerceMall.seller.products.variants.create(
      sellerConnection,
      {
        productId: product.id,
        body: {
          sku_code: RandomGenerator.alphaNumeric(12),
          options: [
            {
              key: "color",
              value: RandomGenerator.alphabets(5),
            },
          ] satisfies IECommerceMallProductVariant.IOption[] & tags.MinItems<1>,
        } satisfies IECommerceMallProductVariant.ICreate,
      },
    );
  typia.assert(variant);
  // Step 6: Seller adds inventory (restock)
  const inventoryRecord: IECommerceMallInventoryRecord =
    await api.functional.eCommerceMall.seller.products.variants.inventory.create(
      sellerConnection,
      {
        productId: product.id,
        variantId: variant.id,
        body: {
          quantity_change: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<10> & tags.Maximum<100>
          >(),
          reason: "initial restock",
        } satisfies IECommerceMallInventoryRecord.ICreate,
      },
    );
  typia.assert(inventoryRecord);
  // Step 7: Customer creates a shipping address
  const address: IECommerceMallCustomerAddress =
    await api.functional.eCommerceMall.customer.addresses.create(
      customerConnection,
      {
        body: {
          recipient_name: RandomGenerator.name(),
          phone_number: RandomGenerator.mobile(),
          street_address: RandomGenerator.paragraph({ sentences: 1 }),
          city: RandomGenerator.alphabets(6),
          state_province: RandomGenerator.alphabets(8),
          postal_code: RandomGenerator.alphaNumeric(5),
          country: "United States",
        } satisfies IECommerceMallCustomerAddress.ICreate,
      },
    );
  typia.assert(address);
  // Step 8: Customer adds variant to cart
  const cartItem: IECommerceMallCartItem =
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
  // Step 9: Customer places order
  const order: IECommerceMallOrder =
    await api.functional.eCommerceMall.customer.orders.create(
      customerConnection,
      {
        body: {
          addressId: address.id,
        } satisfies IECommerceMallOrder.ICreate,
      },
    );
  typia.assert(order);
  const orderItemId: string = order.orderItems[0]!.id;
  // Step 10: Seller creates shipment
  const shipment: IECommerceMallShipment =
    await api.functional.eCommerceMall.seller.shipments.create(
      sellerConnection,
      {
        body: {
          carrierName: "TestCarrier",
          trackingNumber: RandomGenerator.alphaNumeric(12),
          orderItemIds: [orderItemId],
        } satisfies IECommerceMallShipment.ICreate,
      },
    );
  typia.assert(shipment);
  // Step 11: Customer confirms delivery
  const confirmedShipment: IECommerceMallShipment =
    await api.functional.eCommerceMall.customer.shipments.confirm_delivery.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(confirmedShipment);
  // Step 12: Customer writes a review
  const reviewBody: IECommerceMallReview.ICreate = {
    order_item_id: orderItemId,
    rating: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<3> & tags.Maximum<5>
    >(),
    content: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const review: IECommerceMallReview =
    await api.functional.eCommerceMall.customer.reviews.create(
      customerConnection,
      {
        body: reviewBody,
      },
    );
  typia.assert(review);
  // Step 13: Administrator retrieves the review
  const retrievedReview: IECommerceMallReview =
    await api.functional.eCommerceMall.administrator.reviews.at(
      adminConnection,
      {
        reviewId: review.id,
      },
    );
  typia.assert(retrievedReview);
  // Step 14: Validation
  TestValidator.equals("review id", retrievedReview.id, review.id);
  TestValidator.equals("rating", retrievedReview.rating, reviewBody.rating);
  TestValidator.equals("content", retrievedReview.content, reviewBody.content);
  TestValidator.equals("customer id", retrievedReview.customer.id, customerAuth.id);
  TestValidator.equals("customer email", retrievedReview.customer.email, customerAuth.email);
  TestValidator.predicate(
    "customer display name is real (not deleted user)",
    () =>
      retrievedReview.customer.profile !== null &&
      retrievedReview.customer.profile.display_name !== "deleted user",
  );
  TestValidator.equals("product id", retrievedReview.product.id, product.id);
  TestValidator.equals("product name", retrievedReview.product.name, product.name);
  TestValidator.equals("order code", retrievedReview.order.code, order.code);
  TestValidator.equals("deleted_at is null", retrievedReview.deleted_at, null);
  TestValidator.predicate("created_at is valid ISO date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedReview.created_at),
  );
  TestValidator.predicate("updated_at is valid ISO date-time", () =>
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(retrievedReview.updated_at),
  );
}
