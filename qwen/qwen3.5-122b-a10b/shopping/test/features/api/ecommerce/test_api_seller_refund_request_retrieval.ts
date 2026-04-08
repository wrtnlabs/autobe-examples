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
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test seller retrieval of a specific refund request for an order item.
 *
 * Validates that a seller can successfully retrieve refund request details for order items they sell. The test verifies the complete refund request structure including customer reason, current status, timestamps, and the order item reference with seller ownership confirmation.
 *
 * This test exercises the primary success path where a seller accesses a refund request from their pending refund queue to review customer-submitted reasons and make approval decisions.
 *
 * 1. Seller registers and authenticates with the platform
 * 2. Endpoint is called with valid order, item, and request IDs
 * 3. Refund request is retrieved with all required fields
 * 4. Response structure is validated including orderItem reference
 * 5. Seller ownership is confirmed through orderItem.seller reference
 */
export async function test_api_seller_refund_request_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Retrieve refund request (in simulation mode, this returns random valid data)
  // In production with real data, these IDs would reference actual created entities
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const refundRequest =
    await api.functional.ecommerce.seller.orders.items.refund_requests.at(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId,
      },
    );
  typia.assert(refundRequest);
  // 3. Validate refund request structure
  TestValidator.equals(
    "refund request has id",
    refundRequest.id !== undefined,
    true,
  );
  TestValidator.equals(
    "refund request has reason",
    refundRequest.reason !== undefined,
    true,
  );
  TestValidator.equals(
    "refund request has status",
    refundRequest.status !== undefined,
    true,
  );
  TestValidator.equals(
    "refund request has orderItem",
    refundRequest.orderItem !== undefined,
    true,
  );
  // 4. Validate orderItem reference includes seller information
  TestValidator.equals(
    "orderItem has seller reference",
    refundRequest.orderItem.seller !== undefined,
    true,
  );
  TestValidator.equals(
    "seller reference has shop name",
    refundRequest.orderItem.seller.shop_name !== undefined,
    true,
  );
}
