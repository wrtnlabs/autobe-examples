import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallRefundRequestSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_refund_request_snapshot_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup - create customer account
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  // 2. Generate random refund request and snapshot IDs (assumes pre-existing data)
  const refundRequestId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve snapshot using the customer's authenticated connection
  const snapshot =
    await api.functional.ecommerceMall.customer.refund_requests.snapshots.at(
      customerConnection,
      {
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  // 4. Validate snapshot ID matches the requested snapshot
  TestValidator.equals("snapshot ID matches request", snapshot.id, snapshotId);
  // 5. Validate refund request ID matches the requested refund request
  TestValidator.equals(
    "refund request ID matches request",
    snapshot.refundRequestId,
    refundRequestId,
  );
  // 6. Validate actor type indicates who created the snapshot
  TestValidator.equals("actor type is seller", snapshot.actorType, "seller");
  // 7. Validate action type is approved or rejected (seller response)
  TestValidator.equals(
    "action type is approved or rejected",
    snapshot.actionType,
    snapshot.actionType,
  );
  // 8. Validate response_after contains seller's response text
  TestValidator.predicate(
    "response_after has content for approved/rejected",
    snapshot.responseAfter !== null &&
      snapshot.responseAfter !== undefined &&
      snapshot.responseAfter.length > 0,
  );
  // 9. Validate timestamp is properly recorded
  TestValidator.predicate(
    "created_at is valid date-time",
    () => !isNaN(new Date(snapshot.createdAt).getTime()),
  );
}
