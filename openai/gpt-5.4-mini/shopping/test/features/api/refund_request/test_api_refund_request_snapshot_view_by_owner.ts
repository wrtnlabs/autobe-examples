import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformRefundRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformRefundRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_refund_request_snapshot_view_by_owner(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  const refundRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotId = typia.random<string & tags.Format<"uuid">>();
  const snapshot =
    await api.functional.mallPlatform.customer.refundRequests.snapshots.at(
      customerConnection,
      {
        refundRequestId,
        snapshotId,
      },
    );
  typia.assert(snapshot);
  TestValidator.equals(
    "parent refund request id should match the requested refund request",
    snapshot.mallPlatformRefundRequestId,
    refundRequestId,
  );
  TestValidator.equals(
    "snapshot id should match the requested snapshot",
    snapshot.id,
    snapshotId,
  );
  TestValidator.predicate(
    "snapshot reason should be preserved",
    snapshot.snapshotReason.length > 0,
  );
  TestValidator.predicate(
    "status before should be preserved",
    snapshot.statusBefore.length > 0,
  );
  TestValidator.predicate(
    "status after should be preserved",
    snapshot.statusAfter.length > 0,
  );
  TestValidator.predicate(
    "createdAt should be preserved",
    snapshot.createdAt.length > 0,
  );
}
