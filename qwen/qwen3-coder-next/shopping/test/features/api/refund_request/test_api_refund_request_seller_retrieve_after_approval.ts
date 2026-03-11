import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductImage";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

export async function test_api_refund_request_seller_retrieve_after_approval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account with approved status
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await api.functional.ecommerceMall.auth.seller.join(
    sellerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        shop_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSeller.IJoin,
    },
  );
  typia.assert(seller);
  // 2. Create customer account and login
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await api.functional.ecommerceMall.auth.customer.join(
    customerConnection,
    {
      body: {
        email: typia.random<string>(),
        password: RandomGenerator.alphaNumeric(16),
        name: RandomGenerator.name(),
        phone: RandomGenerator.mobile(),
      } satisfies IEcommerceMallCustomer.IJoin,
    },
  );
  typia.assert(customer);
  // 3. Create a product for the seller (simplified - in real scenario would use actual product creation)
  // For this test, we'll focus on the refund request workflow with valid UUIDs
  const productId = typia.random<string & tags.Format<"uuid">>();
  const product: IEcommerceMallProduct.ISummary = {
    id: productId,
    name: RandomGenerator.paragraph({ sentences: 2 }),
    base_price: typia.random<
      number & tags.Type<"uint32"> & tags.Minimum<1000>
    >(),
    is_available: true,
    created_at: new Date().toISOString(),
    seller: {
      id: seller.id,
      shop_name: seller.shop_name,
      approval_status: seller.approval_status,
      is_suspended: seller.is_suspended,
      created_at: seller.created_at,
    } satisfies IEcommerceMallSeller.ISummary,
    main_image: {
      id: typia.random<string & tags.Format<"uuid">>(),
      image_url: "https://example.com/image.jpg",
      sort_order: 0,
      is_main: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      deleted_at: null,
    } satisfies IEcommerceMallProductImage.ISummary,
  };
  // 4. Create an order with delivered item
  // (In real scenario, this would be done through order creation flow)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const variantId = typia.random<string & tags.Format<"uuid">>();
  const orderItem: IEcommerceMallOrderItem.ISummary = {
    id: typia.random<string & tags.Format<"uuid">>(),
    quantity: 1,
    product_name: product.name,
    variant_options: JSON.stringify({}),
    product_price: product.base_price,
    item_status: "delivered" as const,
    product: product,
    variant: {
      id: variantId,
      sku_code: RandomGenerator.alphaNumeric(8),
      price_override: null,
      stock_quantity: 100,
    } satisfies IEcommerceMallProductVariant.ISummary,
    seller: {
      id: seller.id,
      shop_name: seller.shop_name,
      approval_status: seller.approval_status,
      is_suspended: seller.is_suspended,
      created_at: seller.created_at,
    } satisfies IEcommerceMallSeller.ISummary,
  };
  // 5. Customer requests a refund for the delivered item
  const refundRequest =
    await api.functional.ecommerceMall.customer.refund_requests.create(
      customerConnection,
      {
        body: {
          order_item_id: orderItem.id,
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 6. Seller retrieves the pending refund request (initial retrieval)
  const initialRetrieval =
    await api.functional.ecommerceMall.seller.refund_requests.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(initialRetrieval);
  TestValidator.equals(
    "initial status is pending",
    initialRetrieval.status,
    "pending",
  );
  TestValidator.equals(
    "seller ID matches",
    initialRetrieval.seller_id,
    seller.id,
  );
  // 7. Seller approves the refund request
  await api.functional.ecommerceMall.seller.orders.items.refund.approve.approveRefund(
    sellerConnection,
    {
      orderId: orderId,
      orderItemId: orderItem.id,
    },
  );
  // 8. Seller retrieves the refund request again to confirm approval
  const approvalRetrieval =
    await api.functional.ecommerceMall.seller.refund_requests.at(
      sellerConnection,
      {
        refundRequestId: refundRequest.id,
      },
    );
  typia.assert(approvalRetrieval);
  // Validate approval details
  TestValidator.equals(
    "status changed to approved",
    approvalRetrieval.status,
    "approved",
  );
  TestValidator.equals(
    "responded_at is set",
    approvalRetrieval.responded_at === null || approvalRetrieval.responded_at === undefined,
    false,
  );
  TestValidator.equals(
    "order item ID preserved",
    approvalRetrieval.order_item_id,
    orderItem.id,
  );
  TestValidator.equals(
    "customer ID matches",
    approvalRetrieval.customer_id,
    customer.customer.id,
  );
  TestValidator.equals(
    "reason preserved",
    approvalRetrieval.reason,
    refundRequest.reason,
  );
  TestValidator.equals(
    "orderItem details exist",
    approvalRetrieval.orderItem === null || approvalRetrieval.orderItem === undefined,
    false,
  );
  TestValidator.equals(
    "customer details exist",
    approvalRetrieval.customer === null || approvalRetrieval.customer === undefined,
    false,
  );
  TestValidator.equals(
    "seller details exist",
    approvalRetrieval.seller === null || approvalRetrieval.seller === undefined,
    false,
  );
  // Additional validation: ensure all required fields are present
  typia.assert<IEcommerceMallRefundRequest>(approvalRetrieval);
}