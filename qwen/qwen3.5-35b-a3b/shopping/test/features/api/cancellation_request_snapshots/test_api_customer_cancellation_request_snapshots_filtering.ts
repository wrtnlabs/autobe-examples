import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAddress";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallCancellationRequestSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_customer_cancellation_request_snapshots_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer setup
  const customerConnection: api.IConnection = { host: connection.host };
  const customerData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceMallCustomer.IJoin;
  await authorize_customer_join(customerConnection, { body: customerData });
  // 2. Create multiple cancellation requests (each generates snapshots)
  const cancellationRequests: IEcommerceMallCancellationRequest[] = [];
  for (let i = 0; i < 5; i++) {
    const request =
      await generate_random_ecommerce_mall_customer_cancellation_requests_create(
        customerConnection,
        {
          body: {
            order_item_id: typia.random<string & tags.Format<"uuid">>(),
            reason: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies IEcommerceMallCancellationRequest.ICreate,
        },
      );
    typia.assert(request);
    cancellationRequests.push(request);
  }
  // 3. Test filter by action=approved
  const approvedSnapshots =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          action: "approved",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(approvedSnapshots);
  // Validate all returned snapshots have action='approved'
  for (const snapshot of approvedSnapshots.data) {
    TestValidator.equals(
      "snapshot action approved",
      snapshot.action,
      "approved",
    );
  }
  // 4. Test filter by status_before and status_after
  const statusTransitionSnapshots =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          status_before: "pending",
          status_after: "approved",
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(statusTransitionSnapshots);
  // Validate all snapshots have the correct status transition
  for (const snapshot of statusTransitionSnapshots.data) {
    TestValidator.equals(
      "status before pending",
      snapshot.statusBefore,
      "pending",
    );
    TestValidator.equals(
      "status after approved",
      snapshot.statusAfter,
      "approved",
    );
  }
  // 5. Test filter by date range
  const beforeDate = new Date(cancellationRequests[0].created_at);
  beforeDate.setHours(beforeDate.getHours() - 1);
  const afterDate = new Date();
  const dateRangeSnapshots =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          created_at_from: beforeDate.toISOString(),
          created_at_to: afterDate.toISOString(),
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(dateRangeSnapshots);
  // Validate all snapshots are within date range
  for (const snapshot of dateRangeSnapshots.data) {
    const createdAt = new Date(snapshot.createdAt);
    TestValidator.predicate("snapshot after from", createdAt >= beforeDate);
    TestValidator.predicate("snapshot before to", createdAt <= afterDate);
  }
  // 6. Test filter by specific cancellation_request_id
  const specificRequestId = cancellationRequests[0].id;
  const requestIdSnapshots =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          cancellation_request_id: specificRequestId,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(requestIdSnapshots);
  // Validate all snapshots belong to the specified request
  for (const snapshot of requestIdSnapshots.data) {
    TestValidator.equals(
      "snapshot request ID match",
      snapshot.cancellationRequestId,
      specificRequestId,
    );
  }
  // 7. Test combined filters
  const combinedSnapshots =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          action: "approved",
          status_before: "pending",
          status_after: "approved",
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(combinedSnapshots);
  // Validate pagination
  TestValidator.predicate(
    "pagination current >= 1",
    combinedSnapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit > 0",
    combinedSnapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    combinedSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    combinedSnapshots.pagination.pages >= 0,
  );
  // Validate combined filter results
  for (const snapshot of combinedSnapshots.data) {
    TestValidator.equals("combined filter action", snapshot.action, "approved");
    TestValidator.equals(
      "combined filter status_before",
      snapshot.statusBefore,
      "pending",
    );
    TestValidator.equals(
      "combined filter status_after",
      snapshot.statusAfter,
      "approved",
    );
  }
  // 8. Test empty results
  const futureDate = new Date();
  futureDate.setFullYear(futureDate.getFullYear() + 1);
  const emptySnapshots =
    await api.functional.ecommerceMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          created_at_from: futureDate.toISOString(),
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(emptySnapshots);
  TestValidator.equals(
    "empty results data array",
    emptySnapshots.data.length,
    0,
  );
}
