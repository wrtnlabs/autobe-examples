import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_refund_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_refund_requests_create";
import { prepare_random_ecommerce_mall_refund_request } from "../../../prepare/prepare_random_ecommerce_mall_refund_request";

/**
 * Test successful retrieval of a specific refund request snapshot by a customer.
 *
 * Preconditions: Customer is authenticated and has an existing refund request with at least one snapshot.
 *
 * Steps:
 * 1) Authenticate as customer via `/ecommerceMall/auth/customer/join`
 * 2) Create a refund request via `/ecommerceMall/customer/refund-requests` with required data (orderItemId, reason)
 * 3) The system automatically creates a snapshot upon refund request creation or seller response
 * 4) Query for snapshots via `/ecommerceMall/customer/refund-requests/{refundRequestId}/snapshots` to get the snapshotId
 * 5) Call GET `/ecommerceMall/customer/refund-requests/{refundRequestId}/snapshots/{snapshotId}` with both IDs
 * 6) Verify response contains the immutable snapshot data including refundRequestId, status at that time, reason, responseReason if available, and timestamps.
 *
 * Expected outcome: Successfully returns the immutable snapshot capturing the refund request state at a specific point in time.
 */
export async function test_api_refund_request_snapshot_customer_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create actor-specific connection and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Create a refund request (utility handles data preparation and API call)
  const refundRequest =
    await generate_random_ecommerce_mall_customer_refund_requests_create(
      customerConnection,
      {
        body: {
          orderItemId: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IEcommerceMallRefundRequest.ICreate,
      },
    );
  typia.assert(refundRequest);
  // 3. Query for snapshots to obtain valid snapshotId
  const snapshotList: IPageIEcommerceMallRefundRequestSnapshot =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.index(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        body: {
          status: null,
          reason: null,
          responseReason: null,
          createdAtFrom: null,
          createdAtTo: null,
          page: null,
          limit: null,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotList);
  // Verify at least one snapshot exists
  TestValidator.predicate(
    "snapshot list should contain at least one snapshot",
    snapshotList.data.length > 0,
  );
  const targetSnapshot = snapshotList.data[0]!;
  // 4. Retrieve the specific snapshot by ID
  const retrievedSnapshot: IEcommerceMallRefundRequestSnapshot =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.at(
      customerConnection,
      {
        refundRequestId: refundRequest.id,
        snapshotId: targetSnapshot.id,
      },
    );
  typia.assert(retrievedSnapshot);
  // 5. Verify the retrieved snapshot contains immutable data
  TestValidator.equals(
    "snapshot refundRequestId matches parent refund request",
    retrievedSnapshot.refundRequestId,
    refundRequest.id,
  );
  TestValidator.equals(
    "snapshot ID matches requested snapshotId",
    retrievedSnapshot.id,
    targetSnapshot.id,
  );
  TestValidator.predicate(
    "snapshot createdAt is valid timestamp",
    retrievedSnapshot.createdAt.length > 0,
  );
}
