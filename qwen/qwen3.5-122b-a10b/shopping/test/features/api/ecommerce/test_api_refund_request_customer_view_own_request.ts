import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
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
import { generate_random_ecommerce_customer_orders_items_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

export async function test_api_refund_request_customer_view_own_request(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Generate UUIDs for order and order item (representing a delivered order item in the system)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  // 3. Create refund request for the order item
  const refundReason = RandomGenerator.paragraph({ sentences: 3 });
  const refundRequest =
    await api.functional.ecommerce.customer.orders.items.refund_requests.create(
      customerConnection,
      {
        orderId,
        itemId,
        body: {
          reason: refundReason,
        } satisfies IEcommerceRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 4. View the refund request details
  const viewedRequest =
    await api.functional.ecommerce.customer.orders.items.refund_requests.at(
      customerConnection,
      {
        orderId,
        itemId,
        requestId: refundRequest.id,
      },
    );
  typia.assert(viewedRequest);
  // 5. Validate refund request business logic
  TestValidator.equals(
    "refund request ID matches",
    viewedRequest.id,
    refundRequest.id,
  );
  TestValidator.equals("reason matches", viewedRequest.reason, refundReason);
  TestValidator.predicate(
    "has valid status",
    ["pending", "approved", "rejected"].includes(viewedRequest.status),
  );
  TestValidator.predicate(
    "has created_at timestamp",
    viewedRequest.created_at !== null && viewedRequest.created_at !== undefined,
  );
  TestValidator.predicate(
    "has updated_at timestamp",
    viewedRequest.updated_at !== null && viewedRequest.updated_at !== undefined,
  );
  TestValidator.predicate(
    "orderItem is present",
    viewedRequest.orderItem !== null && viewedRequest.orderItem !== undefined,
  );
  // 6. Validate orderItem summary contains required references
  TestValidator.predicate(
    "orderItem has order reference",
    viewedRequest.orderItem.order !== null &&
      viewedRequest.orderItem.order !== undefined,
  );
  TestValidator.predicate(
    "orderItem has productVariant reference",
    viewedRequest.orderItem.productVariant !== null &&
      viewedRequest.orderItem.productVariant !== undefined,
  );
  TestValidator.predicate(
    "orderItem has seller reference",
    viewedRequest.orderItem.seller !== null &&
      viewedRequest.orderItem.seller !== undefined,
  );
  // 7. Validate timestamp fields exist (responded_at may be null for pending requests)
  TestValidator.predicate(
    "has responded_at field",
    viewedRequest.responded_at !== undefined,
  );
  TestValidator.predicate(
    "has rejection_reason field",
    viewedRequest.rejection_reason !== undefined,
  );
}
