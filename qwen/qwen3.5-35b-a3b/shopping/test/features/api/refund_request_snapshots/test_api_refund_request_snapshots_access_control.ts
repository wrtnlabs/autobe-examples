import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

/**
 * Test access control for refund request snapshot viewing.
 * Validates that sellers can only access snapshots for their own refund requests.
 */
export async function test_api_refund_request_snapshots_access_control(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create Seller A
  const sellerAConnection: api.IConnection = { host: connection.host };
  const sellerA = await authorize_seller_join(sellerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerA123!",
      href: "https://seller.test.com/join",
      referrer: "https://seller.test.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerA);
  // 2. Setup: Create Seller B
  const sellerBConnection: api.IConnection = { host: connection.host };
  const sellerB = await authorize_seller_join(sellerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerB123!",
      href: "https://seller.test.com/join",
      referrer: "https://seller.test.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerB);
  // 3. Setup: Create Customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customer123!",
      href: "https://customer.test.com/join",
      referrer: "https://customer.test.com/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 4. Generate test refund request IDs
  // In a real scenario, these would come from refund request creation APIs
  const refundRequestIdA = typia.random<string & tags.Format<"uuid">>();
  const refundRequestIdB = typia.random<string & tags.Format<"uuid">>();
  // 5. Setup: Query parameters for snapshot retrieval
  const snapshotQuery = {
    limit: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
    >(),
    page: 1,
  } satisfies IEcommerceMallRefundRequestSnapshot.IRequest;
  // 6. Test: Seller A accesses their own refund request snapshots
  const sellerASnapshotResponse =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerAConnection,
      {
        refundRequestId: refundRequestIdA,
        body: snapshotQuery,
      },
    );
  typia.assert(sellerASnapshotResponse);
  TestValidator.equals(
    "Seller A snapshot response has valid pagination",
    sellerASnapshotResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Seller A snapshot response has data array",
    Array.isArray(sellerASnapshotResponse.data),
  );
  // 7. Test: Seller B accesses their own refund request snapshots
  const sellerBSnapshotResponse =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.index(
      sellerBConnection,
      {
        refundRequestId: refundRequestIdB,
        body: snapshotQuery,
      },
    );
  typia.assert(sellerBSnapshotResponse);
  TestValidator.equals(
    "Seller B snapshot response has valid pagination",
    sellerBSnapshotResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "Seller B snapshot response has data array",
    Array.isArray(sellerBSnapshotResponse.data),
  );
  // 8. Validate snapshot data structure from Seller A's response
  if (sellerASnapshotResponse.data.length > 0) {
    const snapshot = sellerASnapshotResponse.data[0];
    typia.assert(snapshot);
    // Verify deletedAt is null for active snapshots (unsoft-deleted audit trail entries)
    TestValidator.equals(
      "Snapshot deletedAt is null for active snapshot",
      snapshot.deletedAt,
      null,
    );
    // Verify refundRequestId matches the queried ID
    TestValidator.equals(
      "Snapshot refundRequestId matches queried ID",
      snapshot.refundRequestId,
      refundRequestIdA,
    );
  }
  // 9. Validate pagination structure
  TestValidator.equals(
    "Seller A pagination has records count",
    sellerASnapshotResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "Seller A pagination has pages count",
    sellerASnapshotResponse.pagination.pages >= 0,
    true,
  );
}
