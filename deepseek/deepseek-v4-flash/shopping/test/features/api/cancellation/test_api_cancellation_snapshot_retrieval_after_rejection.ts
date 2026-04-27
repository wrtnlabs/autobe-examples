import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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
import { generate_random_e_commerce_mall_customer_addresses_create } from "../../../generate/generate_random_e_commerce_mall_customer_addresses_create";
import { generate_random_e_commerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_e_commerce_mall_customer_cancellation_requests_create";
import { generate_random_e_commerce_mall_customer_cart_items_create } from "../../../generate/generate_random_e_commerce_mall_customer_cart_items_create";
import { generate_random_e_commerce_mall_customer_orders_create } from "../../../generate/generate_random_e_commerce_mall_customer_orders_create";
import { generate_random_e_commerce_mall_seller_products_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_create";
import { generate_random_e_commerce_mall_seller_products_variants_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_create";
import { generate_random_e_commerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_e_commerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_customer_address } from "../../../prepare/prepare_random_ecommerce_mall_customer_address";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_product_variant } from "../../../prepare/prepare_random_ecommerce_mall_product_variant";

export async function test_api_cancellation_snapshot_retrieval_after_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {});
  // 2. Register a seller
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 3. Seller creates a product with a variant and restocks inventory
  const product = await generate_random_e_commerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const variant =
    await generate_random_e_commerce_mall_seller_products_variants_create(
      sellerConnection,
      { params: { productId: product.id } },
    );
  await generate_random_e_commerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    { params: { productId: product.id, variantId: variant.id } },
  );
  // 4. Customer creates a shipping address
  const address =
    await generate_random_e_commerce_mall_customer_addresses_create(
      customerConnection,
      {},
    );
  // 5. Customer adds the variant to cart
  await generate_random_e_commerce_mall_customer_cart_items_create(
    customerConnection,
    {
      body: {
        product_variant_id: variant.id,
        quantity: 1,
      },
    },
  );
  // 6. Customer places an order
  const order = await generate_random_e_commerce_mall_customer_orders_create(
    customerConnection,
    {
      body: {
        addressId: address.id,
      },
    },
  );
  const orderItem = order.orderItems[0]!;
  // 7. Customer submits a cancellation request with a specific reason
  const cancellationReason = "Changed my mind about this purchase";
  const cancellationRequest =
    await generate_random_e_commerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: cancellationReason,
        },
      },
    );
  // 8. Seller rejects the cancellation request with a rejection reason
  const rejectionReason = "Product has already been prepared for shipping";
  const updatedCancellationRequest =
    await api.functional.eCommerceMall.seller.cancellation_requests.update(
      sellerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        body: {
          status: "rejected",
          rejection_reason: rejectionReason,
        },
      },
    );
  typia.assert(updatedCancellationRequest);
  // Get the first (and only) snapshot from the rejection response
  const createdSnapshot = updatedCancellationRequest.snapshots[0]!;
  // 9. Customer retrieves the snapshot via the target GET endpoint
  const retrievedSnapshot =
    await api.functional.eCommerceMall.customer.cancellation_requests.snapshots.at(
      customerConnection,
      {
        cancellationRequestId: cancellationRequest.id,
        snapshotId: createdSnapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 10. Validate snapshot contents
  TestValidator.equals(
    "cancellation reason matches input",
    retrievedSnapshot.reason,
    cancellationReason,
  );
  TestValidator.equals(
    "snapshot status is rejected",
    retrievedSnapshot.status,
    "rejected",
  );
  TestValidator.predicate(
    "created_at timestamp is present",
    !!retrievedSnapshot.created_at,
  );
}
