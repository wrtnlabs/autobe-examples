import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
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

/**
 * Test refund request snapshot data integrity for dispute resolution.
 *
 * This test validates that snapshots capture complete before/after state
 * including status transitions, reasons, and seller responses.
 *
 * NOTE: Since no refund request creation API endpoints are available in the
 * SDK, this test validates snapshot retrieval and structure using mock data
 * that represents what the API should return after a seller responds to
 * a refund request.
 */
export async function test_api_refund_request_snapshot_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - join and obtain connection
  const customerJoinConnection: api.IConnection = { host: connection.host };
  const customerAuth: IEcommerceMallCustomer.IAuthorized =
    await authorize_customer_join(customerJoinConnection, {
      body: {
        email: typia.random<string>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string>(),
        referrer: typia.random<string>(),
        ip: typia.random<string>(),
      },
    });
  typia.assert(customerAuth);
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_login(customerConnection, {
    body: {
      email: customerAuth.email,
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string>(),
      referrer: typia.random<string>(),
      ip: typia.random<string>(),
    },
  });
  typia.assert(customerAuth);
  // 2. Seller setup - join and obtain connection
  const sellerJoinConnection: api.IConnection = { host: connection.host };
  const sellerAuth: IEcommerceMallSeller.IAuthorized =
    await authorize_seller_join(sellerJoinConnection, {
      body: {
        email: typia.random<string>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string>(),
        referrer: typia.random<string>(),
        ip: typia.random<string>(),
      },
    });
  typia.assert(sellerAuth);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerAuth.email,
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(sellerAuth);
  // 3. Generate refund request ID for the test
  const refundRequestId = typia.random<string>();
  // 4. Generate snapshot data that represents a seller response
  const customerName = RandomGenerator.name();
  const customerEmail = typia.random<string>();
  const originalReason = "Product arrived damaged";
  const sellerResponse =
    "Product was inspected and found to be functioning normally";
  // 5. Seller retrieves the snapshot via API
  const retrievedSnapshot: IEcommerceMallRefundRequestSnapshot =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        refundRequestId,
        snapshotId: typia.random<string>(),
      },
    );
  typia.assert(retrievedSnapshot);
  // 6. Validate snapshot immutability - retrieve again and confirm data is identical
  const retrievedSnapshotAgain: IEcommerceMallRefundRequestSnapshot =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        refundRequestId,
        snapshotId: retrievedSnapshot.id,
      },
    );
  typia.assert(retrievedSnapshotAgain);
  // 7. Validate all snapshot fields
  // Actor identification
  TestValidator.equals(
    "actor type is seller",
    retrievedSnapshot.actorType,
    "seller",
  );
  // Action type - seller response should be response_added
  TestValidator.equals(
    "action type is response_added or rejected",
    retrievedSnapshot.actionType,
    "response_added",
  );
  // Status transition - pending to rejected
  TestValidator.equals(
    "status_before is pending",
    retrievedSnapshot.statusBefore,
    "pending",
  );
  TestValidator.equals(
    "status_after is rejected",
    retrievedSnapshot.statusAfter,
    "rejected",
  );
  // Customer reason preserved unchanged
  TestValidator.equals(
    "reason_before is customer reason",
    retrievedSnapshot.reasonBefore,
    originalReason,
  );
  TestValidator.equals(
    "reason_after is unchanged",
    retrievedSnapshot.reasonAfter,
    originalReason,
  );
  // Seller response captured
  TestValidator.equals(
    "response_before is null",
    retrievedSnapshot.responseBefore,
    null,
  );
  TestValidator.equals(
    "response_after contains seller response",
    retrievedSnapshot.responseAfter,
    sellerResponse,
  );
  // Metadata fields should be null when no other changes
  TestValidator.equals(
    "metadata_before is null",
    retrievedSnapshot.metadataBefore,
    null,
  );
  TestValidator.equals(
    "metadata_after is null",
    retrievedSnapshot.metadataAfter,
    null,
  );
  // Timestamp validation - createdAt should be valid ISO 8601
  const createdAtDate = new Date(retrievedSnapshot.createdAt);
  TestValidator.predicate(
    "createdAt is valid timestamp",
    !isNaN(createdAtDate.getTime()),
  );
  // deletedAt should be null (snapshot not deleted)
  TestValidator.equals("deletedAt is null", retrievedSnapshot.deletedAt, null);
  // Validate refund request ID matches
  TestValidator.equals(
    "refund request ID matches",
    retrievedSnapshot.refundRequestId,
    refundRequestId,
  );
  // Validate snapshot ID is unique
  TestValidator.equals(
    "snapshot ID is consistent between retrievals",
    retrievedSnapshot.id,
    retrievedSnapshotAgain.id,
  );
  // Validate snapshot immutability - all fields identical
  TestValidator.equals(
    "snapshot data is immutable",
    retrievedSnapshot,
    retrievedSnapshotAgain,
  );
}
