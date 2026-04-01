import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_request_snapshot_history(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const request = {
    page: 1,
    limit: 20,
    sort: "-createdAt",
  } satisfies IMallPlatformCancellationRequestSnapshot.IRequest;
  const output =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.index(
      customerConnection,
      {
        orderItemId,
        cancellationRequestId,
        body: request,
      },
    );
  typia.assert(output);
  TestValidator.predicate(
    "pagination metadata exists",
    output.pagination.current >= 0 &&
      output.pagination.limit >= 0 &&
      output.pagination.records >= 0 &&
      output.pagination.pages >= 0,
  );
  TestValidator.equals(
    "requested page is reflected",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "requested limit is reflected",
    output.pagination.limit,
    20,
  );
  for (const snapshot of output.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "parent cancellation request summary exists",
      typeof snapshot.cancellationRequest === "object" &&
        snapshot.cancellationRequest !== null,
    );
    TestValidator.predicate(
      "snapshot status is preserved",
      typeof snapshot.snapshotStatus === "string" &&
        snapshot.snapshotStatus.length > 0,
    );
    TestValidator.predicate(
      "review result is nullable string",
      snapshot.reviewResult === null ||
        typeof snapshot.reviewResult === "string",
    );
    TestValidator.predicate(
      "reason is nullable string",
      snapshot.reason === null || typeof snapshot.reason === "string",
    );
    TestValidator.predicate(
      "audit timestamps are present",
      Boolean(snapshot.changedAt) &&
        Boolean(snapshot.createdAt) &&
        Boolean(snapshot.updatedAt),
    );
  }
  if (output.data.length >= 2) {
    TestValidator.predicate(
      "newest-first order by default",
      output.data[0].createdAt >= output.data[1].createdAt,
    );
  }
}
