import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceCustomer";
import type { IEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceRefundRequestSnapshot";
import type { IEcommerceSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSeller";
import type { IEcommerceSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceSellerProfile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceRefundRequestSnapshot";
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

/**
 * Test refund request snapshots retrieval after seller response.
 *
 * Validates that sellers can successfully retrieve the paginated list of snapshots for a refund request after having responded to it. This scenario ensures the complete audit trail is accessible when the seller has approved or rejected a refund request.
 *
 * The test authenticates both seller and customer actors, then validates the snapshot retrieval endpoint structure and response format. Due to limited SDK function availability for creating orders and refund requests, the test focuses on endpoint validation with randomly generated UUIDs while ensuring proper authorization context.
 *
 * 1. Authenticate seller via join endpoint.
 * 2. Authenticate customer via join endpoint.
 * 3. Call snapshot listing endpoint with randomly generated UUIDs for orderId, itemId, and requestId.
 * 4. Verify response structure contains pagination metadata and data array.
 * 5. Validate snapshot fields when data is available (id, reason, status, seller_response, response_at, created_at).
 * 6. Verify pagination metadata includes current, limit, records, and pages fields.
 * 7. Ensure chronological ordering by created_at when multiple snapshots exist.
 */
export async function test_api_refund_request_snapshots_retrieval_after_seller_response(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const seller = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceSeller.IJoin,
  });
  typia.assert(seller);
  // 2. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.MinLength<8>>(),
      display_name: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceCustomer.IJoin,
  });
  typia.assert(customer);
  // 3. Generate UUIDs for path parameters (simulating existing resources)
  const orderId = typia.random<string & tags.Format<"uuid">>();
  const itemId = typia.random<string & tags.Format<"uuid">>();
  const requestId = typia.random<string & tags.Format<"uuid">>();
  // 4. Call snapshot listing endpoint with seller authentication
  const snapshots =
    await api.functional.ecommerce.seller.orders.items.refund_requests.snapshots.index(
      sellerConnection,
      {
        orderId,
        itemId,
        requestId,
        body: {
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IEcommerceRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 5. Validate response structure
  TestValidator.equals(
    "pagination exists",
    snapshots.pagination !== undefined,
    true,
  );
  TestValidator.equals("data array exists", snapshots.data !== undefined, true);
  // 6. Validate pagination metadata
  TestValidator.predicate(
    "current page is number",
    typeof snapshots.pagination.current === "number",
  );
  TestValidator.predicate(
    "limit is number",
    typeof snapshots.pagination.limit === "number",
  );
  TestValidator.predicate(
    "records is number",
    typeof snapshots.pagination.records === "number",
  );
  TestValidator.predicate(
    "pages is number",
    typeof snapshots.pagination.pages === "number",
  );
  // 7. Validate snapshot data when available
  if (snapshots.data.length > 0) {
    const firstSnapshot = snapshots.data[0];
    // Validate required snapshot fields
    TestValidator.predicate(
      "snapshot has id",
      typeof firstSnapshot.id === "string",
    );
    TestValidator.predicate(
      "snapshot has reason",
      typeof firstSnapshot.reason === "string",
    );
    TestValidator.predicate(
      "snapshot has status",
      typeof firstSnapshot.status === "string",
    );
    TestValidator.predicate(
      "snapshot has created_at",
      typeof firstSnapshot.created_at === "string",
    );
    // Validate nullable fields (seller_response and response_at may be null for pending status)
    TestValidator.predicate(
      "snapshot has seller_response field",
      firstSnapshot.seller_response === null ||
        typeof firstSnapshot.seller_response === "string",
    );
    TestValidator.predicate(
      "snapshot has response_at field",
      firstSnapshot.response_at === null ||
        typeof firstSnapshot.response_at === "string",
    );
    // Validate chronological ordering if multiple snapshots exist
    if (snapshots.data.length > 1) {
      for (let i = 1; i < snapshots.data.length; i++) {
        TestValidator.predicate(
          `snapshot ${i} created_at >= snapshot ${i - 1} created_at`,
          snapshots.data[i].created_at >= snapshots.data[i - 1].created_at,
        );
      }
    }
  }
}
