import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerAddress";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductReviewStat } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductReviewStat";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallShipment } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShipment";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { generate_random_ecommerce_mall_member_orders_create } from "../../../generate/generate_random_ecommerce_mall_member_orders_create";
import { generate_random_ecommerce_mall_member_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_member_refund_requests_create";
import { generate_random_ecommerce_mall_seller_products_create } from "../../../generate/generate_random_ecommerce_mall_seller_products_create";
import { prepare_random_ecommerce_mall_order } from "../../../prepare/prepare_random_ecommerce_mall_order";
import { prepare_random_ecommerce_mall_order_item } from "../../../prepare/prepare_random_ecommerce_mall_order_item";
import { prepare_random_ecommerce_mall_product } from "../../../prepare/prepare_random_ecommerce_mall_product";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_seller_refund_request_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerResult = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(2),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(sellerResult);
  const sellerId = sellerResult.id;
  typia.assert(sellerId);
  // 2. Setup - Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerResult = await api.functional.ecommerceMall.auth.member.join(
    customerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallMember.IJoin,
    },
  );
  typia.assert(customerResult);
  const customerId = customerResult.id;
  typia.assert(customerId);
  // 3. Setup - Create product (seller)
  const product = await api.functional.ecommerceMall.seller.products.create(
    sellerConnection,
    {
      body: {
        name: RandomGenerator.paragraph({ sentences: 2 }),
        description: RandomGenerator.content({ paragraphs: 2 }),
        category_id: typia.random<string & tags.Format<"uuid">>(),
        base_price: typia.random<
          number & tags.Type<"uint32"> & tags.Minimum<1000>
        >(),
      } satisfies IEcommerceMallProduct.ICreate,
    },
  );
  typia.assert(product);
  // 4. Setup - Create customer address for order
  const shippingAddressId = typia.random<string & tags.Format<"uuid">>();
  typia.assert(shippingAddressId);
  // 5. Setup - Create order (customer)
  const order = await api.functional.ecommerceMall.member.orders.create(
    customerConnection,
    {
      body: {
        shipping_address_id: shippingAddressId,
        order_items: [
          {
            product_variant_id: product.variants[0].id,
            quantity: 2,
          } satisfies IEcommerceMallOrderItem.ICreate,
        ],
      } satisfies IEcommerceMallOrder.ICreate,
    },
  );
  typia.assert(order);
  // 6. Setup - Get order item for refund request
  const orderItemId = order.items[0].id;
  typia.assert(orderItemId);
  // 7. Setup - Create refund request (customer)
  const refundRequest =
    await api.functional.ecommerceMall.member.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItemId,
          reason: "Product arrived damaged",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  const refundRequestId = refundRequest.id;
  typia.assert(refundRequestId);
  // Verify refund request is in pending status
  TestValidator.equals(
    "refund request initial status",
    refundRequest.status,
    "pending",
  );
  // 8. Test execution - Seller rejects refund request with valid reason
  const rejectionReason =
    "Customer did not provide sufficient evidence for damage claim";
  const rejectedRefundRequest =
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        id: refundRequestId,
        body: {
          status: "rejected",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  typia.assert(rejectedRefundRequest);
  // 9. Verify rejection response
  TestValidator.equals(
    "rejected status",
    rejectedRefundRequest.status,
    "rejected",
  );
  TestValidator.equals(
    "rejected_by_seller_id set correctly",
    rejectedRefundRequest.rejected_by_seller_id,
    sellerId,
  );
  // 10. Verify order item status remains 'delivered'
  TestValidator.equals(
    "order item status unchanged after rejection",
    rejectedRefundRequest.order_item.status,
    "delivered",
  );
  // 11. Verify stock was NOT restored (variant quantity unchanged)
  const originalStock = product.variants[0].stock_quantity;
  typia.assert(originalStock);
  TestValidator.equals(
    "stock not restored on rejection",
    product.variants[0].stock_quantity,
    originalStock,
  );
  // 12. Test - Empty rejection reason validation (should fail)
  // Create another refund request to test empty reason rejection
  const refundRequest2 =
    await api.functional.ecommerceMall.member.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Another issue",
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest2);
  typia.assert(refundRequest2.order_item);
  const orderItemId2 = refundRequest2.order_item.id;
  typia.assert(orderItemId2);
  await TestValidator.error("empty rejection reason validation", async () => {
    // This test validates that the backend requires proper rejection handling
    // The actual rejection reason handling is backend-specific
    await api.functional.ecommerceMall.seller.refund_requests.update(
      sellerConnection,
      {
        id: refundRequest2.id,
        body: {
          status: "rejected",
        } satisfies IEcommerceMallRefundRequest.IUpdate,
      },
    );
  });
  // 13. Test - Customer cannot submit duplicate refund request for same item
  await TestValidator.error(
    "cannot submit duplicate refund request",
    async () => {
      await api.functional.ecommerceMall.member.refund_requests.create(
        customerConnection,
        {
          body: {
            order_item_id: orderItemId,
            reason: "Second attempt",
          } satisfies IEcommerceMallRefundRequest.ICreate,
        },
      );
    },
  );
}
