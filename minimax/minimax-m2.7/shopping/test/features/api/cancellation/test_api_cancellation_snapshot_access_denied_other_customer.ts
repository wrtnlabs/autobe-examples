import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCheckoutConfirm } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCheckoutConfirm";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallInventoryRecord } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallInventoryRecord";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import type { IEcommerceMallShipmentItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipmentItem";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequest";
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
import { generate_random_ecommerce_mall_customer_cart_items_create } from "../../../generate/generate_random_ecommerce_mall_customer_cart_items_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { generate_random_ecommerce_mall_seller_products_variants_inventory_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_variants_inventory_create";
import { prepare_random_ecommerce_mall_cart_item } from "../../../prepare/prepare_random_ecommerce_mall_cart_item";
import { prepare_random_ecommerce_mall_inventory_record } from "../../../prepare/prepare_random_ecommerce_mall_inventory_record";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";

export async function test_api_cancellation_snapshot_access_denied_other_customer(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A (order owner who will request cancellation)
  const customerACustomer: api.IConnection = { host: connection.host };
  const customerAAuthorized = await authorize_customer_join(
    customerACustomer,
    {},
  );
  // 2. Register Customer B (unauthorized - will try to access Customer A's snapshot)
  const customerBCustomer: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerBCustomer, {});
  // 3. Register Seller (will approve cancellation and create snapshot)
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {});
  // 4. Seller creates product with inventory
  const product = await generate_random_ecommerce_mall_seller_products_create(
    sellerConnection,
    {},
  );
  const variant = product.variants[0];
  // 5. Add inventory to variant
  await generate_random_ecommerce_mall_seller_products_variants_inventory_create(
    sellerConnection,
    {
      params: {
        productId: product.id,
        variantId: variant.id,
      },
      body: {
        operation: "restock",
        quantity: 10,
        reason: "Initial inventory for testing",
      },
    },
  );
  // 6. Customer A adds item to cart
  const cartItem =
    await generate_random_ecommerce_mall_customer_cart_items_create(
      customerACustomer,
      {
        body: {
          variant_id: variant.id,
          quantity: 1,
        },
      },
    );
  typia.assert(cartItem);
  // 7. Customer A completes checkout
  const order =
    await api.functional.ecommerceMall.customer.checkout.confirm.create(
      customerACustomer,
      {
        body: {
          payment_token: "test_token_" + RandomGenerator.alphaNumeric(8),
        } satisfies IEcommerceMallCheckoutConfirm.IRequest,
      },
    );
  typia.assert(order);
  // 8. Customer A creates cancellation request
  const cancellationRequests =
    await api.functional.ecommerceMall.customer.cancellation_requests.index(
      customerACustomer,
      {
        body: {
          status: "pending",
        } satisfies IEcommerceMallCancellationRequest.IRequest,
      },
    );
  typia.assert(cancellationRequests);
  const cancellationRequest = cancellationRequests.data[0];
  // 9. Seller approves cancellation (creates snapshot)
  const approvedCancellation =
    await api.functional.ecommerceMall.seller.cancellation_requests.approve(
      sellerConnection,
      {
        requestId: cancellationRequest.id,
      },
    );
  typia.assert(approvedCancellation);
  // Get the snapshot ID from approved cancellation
  const snapshotId = approvedCancellation.snapshots[0].id;
  // 10. Customer B (unauthorized) tries to access Customer A's cancellation request snapshot
  // Should return 404 - authorization should deny access
  await TestValidator.error(
    "Customer B cannot access Customer A's cancellation snapshot",
    async () => {
      await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.at(
        customerBCustomer,
        {
          requestId: cancellationRequest.id,
          snapshotId: snapshotId,
        },
      );
    },
  );
}
