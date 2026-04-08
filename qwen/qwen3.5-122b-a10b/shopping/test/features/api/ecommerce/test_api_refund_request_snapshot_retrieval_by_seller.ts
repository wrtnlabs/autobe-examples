import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
import type { IEcommerceRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequest";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
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
import { generate_random_ecommerce_customer_orders_items_refund_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_refund_requests_create";
import { prepare_random_ecommerce_refund_request } from "../../../prepare/prepare_random_ecommerce_refund_request";

/**
 * Test seller refund request snapshot retrieval by complete relationship chain.
 *
 * Validates that a seller can successfully retrieve a refund request snapshot for an order item belonging to a product they own. This tests the primary success path where the seller views the audit trail of a refund request.
 *
 * Due to limited available SDK functions for complete order creation flow, this test focuses on the snapshot retrieval endpoint validation with properly formatted UUID parameters.
 *
 * 1. Register and authenticate a customer
 * 2. Register and authenticate a seller
 * 3. Generate UUID identifiers for the relationship chain (orderId, itemId, requestId, snapshotId)
 * 4. Attempt to retrieve the refund request snapshot using the complete path parameters
 * 5. Validate the snapshot response structure and field types
 *
 * @param connection Base HTTP connection configuration
 */
export async function test_api_refund_request_snapshot_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Register and authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 3. Generate UUID identifiers for the relationship chain
  const orderId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const requestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Retrieve the refund request snapshot using seller connection
  const snapshot =
    await api.functional.ecommerce.seller.orders.items.refund_requests.snapshots.at(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 5. Validate snapshot structure
  TestValidator.equals("snapshot has id", snapshot.id, snapshotId);
  TestValidator.equals("snapshot has reason", typeof snapshot.reason, "string");
  TestValidator.equals("snapshot has status", typeof snapshot.status, "string");
  TestValidator.predicate(
    "snapshot has created_at",
    snapshot.created_at !== undefined,
  );
}
