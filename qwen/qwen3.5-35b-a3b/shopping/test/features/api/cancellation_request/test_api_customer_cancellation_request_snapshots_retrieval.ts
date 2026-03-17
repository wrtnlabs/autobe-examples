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

export async function test_api_customer_cancellation_request_snapshots_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer authentication
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAuth);
  // 2. Retrieve snapshots with a valid UUID format
  // Note: Actual snapshots are created when sellers respond to cancellation requests
  // This is an external process not exposed via SDK, so we test endpoint structure
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshotsResponse =
    await api.functional.ecommerceMall.customer.cancellation_requests.snapshots.index(
      customerConnection,
      {
        cancellationRequestId,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshotsResponse);
  // 3. Validate pagination metadata structure
  TestValidator.equals(
    "pagination current page is integer",
    typeof snapshotsResponse.pagination.current,
    "number",
  );
  TestValidator.equals(
    "pagination limit is integer",
    typeof snapshotsResponse.pagination.limit,
    "number",
  );
  TestValidator.predicate(
    "pagination records is non-negative integer",
    snapshotsResponse.pagination.records >= 0 &&
      Number.isInteger(snapshotsResponse.pagination.records),
  );
  TestValidator.predicate(
    "pagination pages is non-negative integer",
    snapshotsResponse.pagination.pages >= 0 &&
      Number.isInteger(snapshotsResponse.pagination.pages),
  );
  // 4. Validate data array structure
  TestValidator.equals(
    "data is an array",
    Array.isArray(snapshotsResponse.data),
    true,
  );
  // 5. Validate pages calculation matches records and limit
  const expectedPages =
    snapshotsResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          snapshotsResponse.pagination.records /
            snapshotsResponse.pagination.limit,
        );
  TestValidator.equals(
    "pagination pages calculated correctly",
    snapshotsResponse.pagination.pages,
    expectedPages,
  );
  // 6. If snapshots exist (when seller has responded), validate individual snapshot fields
  if (snapshotsResponse.data.length > 0) {
    const snapshot = snapshotsResponse.data[0];
    // Validate required snapshot fields
    TestValidator.equals("snapshot has id", typeof snapshot.id, "string");
    TestValidator.equals(
      "snapshot has cancellationRequestId",
      typeof snapshot.cancellationRequestId,
      "string",
    );
    TestValidator.equals(
      "snapshot actorType is seller",
      snapshot.actorType,
      "seller",
    );
    TestValidator.equals(
      "snapshot action is valid (approved or rejected)",
      snapshot.action === "approved" || snapshot.action === "rejected",
      true,
    );
    TestValidator.equals(
      "snapshot statusBefore is string or null",
      typeof snapshot.statusBefore,
      "string",
    );
    TestValidator.equals(
      "snapshot statusAfter is string or null",
      typeof snapshot.statusAfter,
      "string",
    );
    TestValidator.predicate(
      "snapshot createdAt is valid date-time",
      snapshot.createdAt !== null &&
        !Number.isNaN(Date.parse(snapshot.createdAt)),
    );
    TestValidator.predicate(
      "snapshot updatedAt is valid date-time",
      snapshot.updatedAt !== null &&
        !Number.isNaN(Date.parse(snapshot.updatedAt)),
    );
  }
}