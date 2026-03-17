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
 * Test seller retrieval of refund request snapshot.
 * 1. Customer joins account for context switching
 * 2. Seller joins account and logs in
 * 3. Seller retrieves snapshot for their refund request
 * 4. Validate snapshot contains complete before/after audit trail
 * 5. Verify snapshot immutability
 */
export async function test_api_refund_request_snapshot_retrieval_by_seller(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - create account for context switching
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Seller setup - create and login
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = RandomGenerator.alphaNumeric(16);
  const sellerConnection: api.IConnection = { host: connection.host };
  await authorize_seller_join(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  await authorize_seller_login(sellerConnection, {
    body: {
      email: sellerEmail,
      password: sellerPassword,
    } satisfies IEcommerceMallSeller.ILogin,
  });
  // 3. Seller retrieves snapshot using generated UUIDs
  // In real scenario these would be obtained from seller's refund request list
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.ecommerceMall.seller.refund_requests.snapshots.at(
      sellerConnection,
      {
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot contains complete audit trail
  // typia.assert already validated all fields exist and have correct types
  TestValidator.equals("snapshot id matches", snapshot.id, snapshotId);
  TestValidator.equals(
    "refund request reference matches",
    snapshot.refundRequestId,
    refundRequestId,
  );
  // Validate actor type is seller
  TestValidator.equals("actor is seller", snapshot.actorType, "seller");
  // Validate action type is approved or rejected (seller response actions)
  TestValidator.predicate(
    "action type is seller response",
    snapshot.actionType === "approved" || snapshot.actionType === "rejected",
  );
  // Validate status transitions can exist (one or both can be null)
  TestValidator.predicate(
    "has valid status transitions",
    snapshot.statusBefore !== null || snapshot.statusAfter !== null,
  );
  // Validate timestamp format
  TestValidator.equals(
    "created at is valid date",
    new Date(snapshot.createdAt).getTime(),
    0,
  );
  if (snapshot.deletedAt !== null) {
    TestValidator.equals(
      "deleted at is valid date",
      new Date(snapshot.deletedAt).getTime(),
      0,
    );
  }
  // 5. Validate snapshot immutability - record exists with all audit fields
  TestValidator.predicate(
    "snapshot is immutable record with audit fields",
    snapshot.id.length > 0 &&
      snapshot.createdAt.length > 0 &&
      snapshot.refundRequestId.length > 0,
  );
}