import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentDelivery";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import type { IParentReference } from "@ORGANIZATION/PROJECT-api/lib/structures/IParentReference";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_customer_checkout_create } from "../../../generate/generate_random_ecommerce_mall_customer_checkout_create";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_create";
import { generate_random_ecommerce_mall_seller_shipments_create } from "../../../generate/generate_random_ecommerce_mall_seller_shipments_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_category } from "../../../prepare/prepare_random_ecommerce_mall_category";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_image } from "../../../prepare/prepare_random_ecommerce_mall_product_image";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";
import { prepare_random_ecommerce_mall_product_variant_option } from "../../../prepare/prepare_random_ecommerce_mall_product_variant_option";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";
import { prepare_random_ecommerce_mall_shipment } from "../../../prepare/prepare_random_ecommerce_mall_shipment";

/**
 * Test that a customer can successfully retrieve the snapshots of their own refund request
 * after the seller has responded. First authenticate as admin and create a category.
 * Then authenticate as seller, create a product with a variant. Authenticate as customer,
 * add variant to cart, checkout to create an order with order items. Seller creates shipment
 * with the order items. Customer confirms delivery of the shipment, advancing order items
 * to 'delivered' status. Customer creates a refund request with a reason. Seller responds
 * to the refund request (either approving or rejecting). Customer then retrieves the snapshots
 * for this refund request. Verify the response contains at least one snapshot with status
 * (approved/rejected), reason, responseReason, and createdAt timestamp. Snapshots are immutable
 * and preserve the state at the moment of seller response.
 */
export async function test_api_refund_request_snapshot_customer_retrieves_own_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and category creation
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies Partial<IEcommerceMallAdmin.IJoin> as DeepPartial<IEcommerceMallAdmin.IJoin>,
  });
  const category = await generate_random_ecommerce_mall_admin_categories_create(
    adminConnection,
    { body: {} },
  );
  typia.assert(category);
  // 2. Seller setup and product/variant creation
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies Partial<IEcommerceMallSeller.IJoin> as DeepPartial<IEcommerceMallSeller.IJoin>,
  });
  typia.assert(seller);
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    { body: {} },
  );
  typia.assert(product);
  const variant =
    await generate_random_ecommerce_mall_seller_products_variants_create(
      sellerConnection,
      {
        params: { productId: product.id },
        body: {
          skuCode: RandomGenerator.alphaNumeric(10),
          options: [
            {
              optionName: "Color",
              optionValue: RandomGenerator.pick(["Red", "Blue", "Green"]),
            } satisfies IEcommerceMallProductVariantOption.ICreate,
          ],
          price: typia.random<number & tags.Minimum<1> & tags.Maximum<1000>>(),
          stock: 100,
        } satisfies Partial<IEcommerceMallProductVariant.ICreate> as DeepPartial<IEcommerceMallProductVariant.ICreate>,
      },
    );
  typia.assert(variant);
  // 3. Customer setup - add to cart and checkout
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies Partial<IEcommerceMallCustomer.IJoin> as DeepPartial<IEcommerceMallCustomer.IJoin>,
  });
  typia.assert(customer);
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerConnection,
      {
        body: {
          productVariantId: variant.id,
          quantity: 1,
        } satisfies Partial<IEcommerceMallCartItem.ICreate> as DeepPartial<IEcommerceMallCartItem.ICreate>,
      },
    );
  typia.assert(cartItem);
  const order = await generate_random_ecommerce_mall_customer_checkout_create(
    customerConnection,
    {
      body: {
        recipientName: RandomGenerator.name(),
        recipientPhone: RandomGenerator.mobile(),
        streetAddress: "123 Test Street",
        city: "Seoul",
        state: "Seoul",
        postalCode: "12345",
        country: "KR",
      } satisfies Partial<IEcommerceMallOrder.ICreate> as DeepPartial<IEcommerceMallOrder.ICreate>,
    },
  );
  typia.assert(order);
  // 4. Get the order item ID from the created order
  const orderItem = order.orderItems[0] as
    | IEcommerceMallOrderItem.ISummary
    | undefined;
  const orderItemId = orderItem?.id;
  if (!orderItemId) {
    throw new Error("Order item not found");
  }
  // 5. Seller creates shipment
  const shipment = await generate_random_ecommerce_mall_seller_shipments_create(
    sellerConnection,
    {
      body: {
        orderItemIds: [orderItemId],
        carrierName: "FedEx",
        trackingNumber: RandomGenerator.alphaNumeric(15),
      } satisfies Partial<IEcommerceMallShipment.ICreate> as DeepPartial<IEcommerceMallShipment.ICreate>,
    },
  );
  typia.assert(shipment);
  // 6. Customer confirms delivery
  const deliveryConfirmation =
    await api.functional.ecommerceMall.customer.shipments.delivery.confirm.confirmDelivery(
      customerConnection,
      {
        shipmentId: shipment.id,
      },
    );
  typia.assert(deliveryConfirmation);
  // 7. Customer creates refund request
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: orderItemId,
          reason: "Product does not match description",
        } satisfies Partial<IEcommerceMallRefundRequest.ICreate> as DeepPartial<IEcommerceMallRefundRequest.ICreate>,
      },
    );
  typia.assert(refundRequest);
  // 8. Seller responds to refund request
  const responseReason = "Refund approved - processing payment";
  const sellerResponse =
    await api.functional.ecommerceMall.seller.refundRequests.actions.respond(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
          responseReason: responseReason,
        } satisfies IEcommerceMallRefundRequest.IRespond,
      },
    );
  typia.assert(sellerResponse);
  // 9. Customer retrieves snapshots
  const snapshotsResponse =
    await api.functional.ecommerceMall.customer.refundRequests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 10. Verify snapshots contain expected data
  TestValidator.predicate(
    "snapshots has data",
    snapshotsResponse.data.length > 0,
  );
  const snapshot = snapshotsResponse.data[0]!;
  typia.assert(snapshot);
  // Verify required snapshot fields exist
  TestValidator.predicate(
    "snapshot has status",
    snapshot.status !== null && snapshot.status !== undefined,
  );
  TestValidator.predicate(
    "snapshot has reason",
    snapshot.reason !== null && snapshot.reason !== undefined,
  );
  TestValidator.predicate(
    "snapshot has responseReason",
    snapshot.responseReason === responseReason,
  );
  TestValidator.predicate("snapshot has createdAt", !!snapshot.createdAt);
  // Verify the snapshot captures the approved status
  TestValidator.equals(
    "snapshot status is approved",
    snapshot.status,
    "approved",
  );
}
