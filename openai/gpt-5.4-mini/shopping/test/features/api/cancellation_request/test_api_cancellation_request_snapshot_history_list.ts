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

export async function test_api_cancellation_request_snapshot_history_list(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test cancellation request snapshot history browsing.
   *
   * Verifies that the nested snapshot-history endpoint returns a paginated immutable list for a customer-authenticated
   * session, and that each returned snapshot preserves the related cancellation request summary together with the
   * historical fields exposed by the DTO.
   *
   * 1. Register and authenticate a customer through an isolated connection.
   * 2. Request cancellation snapshot history for a nested order item and cancellation request route.
   * 3. Validate pagination metadata, snapshot field completeness, and newest-first ordering by snapshot timestamps.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const body = {
    page: 1,
    limit: 10,
    search: RandomGenerator.alphabets(3),
    sort: "createdAt",
    order: "desc",
    from: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    to: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  } satisfies IMallPlatformCancellationRequestSnapshot.IRequest;
  const output =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.index(
      customerConnection,
      {
        orderItemId,
        cancellationRequestId,
        body,
      },
    );
  typia.assert(output);
  TestValidator.equals("pagination current page", output.pagination.current, 1);
  TestValidator.equals("pagination limit", output.pagination.limit, 10);
  TestValidator.predicate(
    "pagination records is non-negative",
    output.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    output.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "snapshot list size is within the requested limit",
    output.data.length <= output.pagination.limit,
  );
  for (const snapshot of output.data) {
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot relation is present",
      snapshot.cancellationRequest !== null && snapshot.cancellationRequest !== undefined,
    );
    TestValidator.predicate(
      "snapshot status is preserved",
      typeof snapshot.snapshotStatus === "string" &&
        snapshot.snapshotStatus.length > 0,
    );
    TestValidator.predicate(
      "review result is string or null",
      snapshot.reviewResult === null ||
        typeof snapshot.reviewResult === "string",
    );
    TestValidator.predicate(
      "reason is string or null",
      snapshot.reason === null || typeof snapshot.reason === "string",
    );
    TestValidator.predicate(
      "changedAt is present",
      typeof snapshot.changedAt === "string" && snapshot.changedAt.length > 0,
    );
    TestValidator.predicate(
      "createdAt is present",
      typeof snapshot.createdAt === "string" && snapshot.createdAt.length > 0,
    );
    TestValidator.predicate(
      "updatedAt is present",
      typeof snapshot.updatedAt === "string" && snapshot.updatedAt.length > 0,
    );
    TestValidator.predicate(
      "deletedAt is nullable",
      snapshot.deletedAt === null || typeof snapshot.deletedAt === "string",
    );
  }
  for (let i = 1; i < output.data.length; i++) {
    TestValidator.predicate(
      "snapshots are ordered newest first by createdAt",
      output.data[i - 1].createdAt >= output.data[i].createdAt,
    );
  }
  const repeated =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.index(
      customerConnection,
      {
        orderItemId,
        cancellationRequestId,
        body,
      },
    );
  typia.assert(repeated);
  TestValidator.equals(
    "repeat request is stable",
    repeated.pagination,
    output.pagination,
  );
}
