import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCart";
import type { IEcommerceMallCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCartItem";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductSnapshot";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOptionValue } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOptionValue";
import type { IEcommerceMallRefundRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequest";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import type { IEcommerceMallReview } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallReview";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfile";
import type { IEcommerceMallSellerProfileSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSellerProfileSnapshot";
import type { IEcommerceMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallShippingAddress";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
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

/**
 * Test that a customer cannot view refund request snapshots belonging to other customers.
 *
 * This test verifies the access control enforcement ensures proper data isolation between customers.
 * When Customer B queries their refund request snapshots, the system must only return snapshots
 * belonging to Customer B, never exposing Customer A's data regardless of the query parameters.
 *
 * Prerequisites: System must have refund request snapshots belonging to other customers.
 *
 * Steps:
 * 1. Register Customer A and authenticate
 * 2. Register Customer B and authenticate (different customer)
 * 3. Customer B queries their refund request snapshots via PATCH
 * 4. Verify response contains only Customer B's snapshots (identified by customer ID)
 * 5. Verify Customer B cannot see any snapshots belonging to Customer A
 *
 * Expected: System enforces access control - Customer B receives only their own snapshots,
 * demonstrating proper data isolation between customers.
 */
export async function test_api_refund_snapshot_customer_isolation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as Customer A
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {});
  typia.assert(customerA);
  // 2. Register and authenticate as Customer B
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {});
  typia.assert(customerB);
  // 3. Customer B queries their refund request snapshots
  const customerBSnapshotsResponse =
    await api.functional.ecommerceMall.customer.refund_request_snapshots.index(
      customerBConnection,
      {
        body: {
          page: 1,
          limit: 100,
        } satisfies IEcommerceMallRefundRequestSnapshot.IRequest,
      },
    );
  typia.assert(customerBSnapshotsResponse);
  // 4. Verify Customer B can only see their own snapshots
  // All snapshots returned must belong to Customer B (identified by customer ID)
  for (const snapshot of customerBSnapshotsResponse.data) {
    TestValidator.equals(
      "Customer B can only see their own snapshots",
      snapshot.customer.id,
      customerB.id,
    );
  }
  // 5. Verify Customer B's snapshots list does not contain any of Customer A's data
  // If there are snapshots, ensure none belong to Customer A
  if (customerBSnapshotsResponse.data.length > 0) {
    const containsCustomerASnapshot = customerBSnapshotsResponse.data.some(
      (snapshot) => snapshot.customer.id === customerA.id,
    );
    TestValidator.equals(
      "Customer B should not see Customer A's snapshots",
      containsCustomerASnapshot,
      false,
    );
  }
}
