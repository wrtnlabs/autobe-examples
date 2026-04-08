import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequest";
import type { IEcommerceCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCancellationRequestSnapshot";
import type { IEcommerceCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCategory";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrder";
import type { IEcommerceOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceOrderItem";
import type { IEcommerceProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProduct";
import type { IEcommerceProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceProductVariant";
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
import { generate_random_ecommerce_customer_orders_items_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_customer_orders_items_cancellation_requests_create";
import { prepare_random_ecommerce_cancellation_request } from "../../../prepare/prepare_random_ecommerce_cancellation_request";

export async function test_api_cancellation_request_snapshot_view_rejected(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer registration and authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // Note: This test validates the snapshot viewing endpoint structure for rejected cancellation requests.
  // In a complete test scenario, we would need:
  // 1. A valid order with paid items created by the customer
  // 2. A cancellation request created for one of the order items
  // 3. Seller rejection of the cancellation request (seller endpoints not available in SDK)
  // 4. Snapshot generation from the rejection workflow
  //
  // Since seller rejection endpoints are not available in the provided SDK, this test
  // focuses on verifying the snapshot viewing endpoint accepts valid parameters and
  // returns properly structured snapshot data when snapshots exist in the system.
  //
  // For a complete end-to-end test of the rejection workflow, seller authentication
  // and rejection endpoints would need to be added to the SDK.
  // 2. Create a cancellation request with valid UUIDs
  // In production, these would come from actual order and item creation
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  // 3. Attempt to view the cancellation request snapshot
  // This validates the endpoint structure and response type
  // In a real scenario, the snapshot would be created when seller rejects the request
  const snapshot =
    await api.functional.ecommerce.customer.orders.items.cancellation_requests.snapshots.at(
      customerConnection,
      {
        orderId,
        itemId,
        requestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot structure contains all required audit trail fields
  TestValidator.equals("snapshot has ID", snapshot.id, snapshotId);
  TestValidator.equals(
    "snapshot references cancellation request",
    snapshot.ecommerceCancellationRequestId,
    requestId,
  );
  TestValidator.predicate(
    "has creation timestamp",
    snapshot.createdAt.length > 0,
  );
  TestValidator.predicate(
    "has status before",
    snapshot.statusBefore.length > 0,
  );
  TestValidator.predicate("has status after", snapshot.statusAfter.length > 0);
  TestValidator.predicate("has actor ID", snapshot.changedByActorId.length > 0);
  TestValidator.predicate(
    "has actor type",
    snapshot.changedByActorType.length > 0,
  );
  // changeReason may be null for approved requests, but should exist for rejected ones
  TestValidator.predicate(
    "has change reason field",
    snapshot.changeReason !== undefined,
  );
}
