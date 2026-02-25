import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
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
import { generate_random_ecommerce_customer_orders_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_refund_request_approval_at_7_day_boundary(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create seller account (with auth)
  const sellerAuthConnection: api.IConnection = { host: connection.host };
  const sellerAccount: IEcommerceSeller.IAuthorized =
    await authorize_seller_join(sellerAuthConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    });
  // 2. Create customer account (with auth)
  const customerAuthConnection: api.IConnection = { host: connection.host };
  const customerAccount: IEcommerceCustomer.IAuthorized =
    await authorize_customer_join(customerAuthConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "1234",
        href: "http://localhost",
        referrer: "http://localhost",
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    });
  // 3. Create a product
  const product = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    price: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1000>>(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    category: RandomGenerator.pick(["Electronics", "Furniture", "Clothing"]),
  };
  // 4. Create an order with the product (delivered status, 7 days old)
  const orderDate = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const orderItem = {
    order_id: typia.random<string & tags.Format<"uuid">>(),
    product_id: typia.random<string & tags.Format<"uuid">>(),
    quantity: typia.random<number & tags.Type<"uint32"> & tags.Minimum<1>>(),
    price: product.price,
    status: "delivered" as const,
    created_at: orderDate.toISOString(),
  };
  // 5. Create a refund request for the order item
  const refundRequest =
    await generate_random_ecommerce_customer_orders_refund_requests_create(
      customerAuthConnection,
      {
        params: {
          id: orderItem.order_id,
        },
        body: {
          reason: "Product not as described",
        },
      },
    );
  typia.assert(refundRequest);
  // 6. Verify initial status is 'pending'
  TestValidator.equals(
    "refund request status",
    refundRequest.status,
    "pending",
  );
  // 7. Approve the refund request as seller
  const approvedRefundRequest =
    await api.functional.ecommerce.seller.orders.refund_requests.update(
      sellerAuthConnection,
      {
        orderId: orderItem.order_id,
        refundRequestId: refundRequest.id,
        body: {
          status: "approved",
        },
      },
    );
  typia.assert(approvedRefundRequest);
  // 8. Verify status is now 'approved'
  TestValidator.equals(
    "refund request approved",
    approvedRefundRequest.status,
    "approved",
  );
}
