import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequest";
import type { IEcommerceMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCancellationRequestSnapshot";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallProductVariantOption } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariantOption";
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
import { generate_random_ecommerce_mall_customer_cancellation_requests_create } from "../../../generate/generate_random_ecommerce_mall_customer_cancellation_requests_create";
import { prepare_random_ecommerce_mall_cancellation_request } from "../../../prepare/prepare_random_ecommerce_mall_cancellation_request";

export async function test_api_cancellation_request_retrieve_approved_with_snapshots(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer-specific connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
      href: "https://test.example.com/register",
      referrer: "https://test.example.com/home",
    },
  });
  // 2. Create a cancellation request
  const createdRequest: IEcommerceMallCancellationRequest =
    await generate_random_ecommerce_mall_customer_cancellation_requests_create(
      customerConnection,
      {},
    );
  typia.assert(createdRequest);
  // 3. Retrieve the cancellation request via GET endpoint
  const retrievedRequest: IEcommerceMallCancellationRequest =
    await api.functional.ecommerceMall.customer.cancellation_requests.at(
      customerConnection,
      {
        cancellationRequestId: createdRequest.id,
      },
    );
  typia.assert(retrievedRequest);
  // 4. Validate the cancellation request matches what was created
  TestValidator.equals(
    "retrieved request ID matches created request ID",
    retrievedRequest.id,
    createdRequest.id,
  );
  TestValidator.equals(
    "retrieved reason matches created reason",
    retrievedRequest.reason,
    createdRequest.reason,
  );
  // 5. Validate snapshots array structure
  TestValidator.predicate(
    "snapshots array exists",
    Array.isArray(retrievedRequest.snapshots),
  );
  // 6. Validate snapshot entries if present
  if (retrievedRequest.snapshots.length > 0) {
    const snapshot = retrievedRequest.snapshots[0]!;
    typia.assert(snapshot);
    TestValidator.predicate(
      "snapshot has valid status_before",
      ["pending", "approved", "rejected"].includes(snapshot.statusBefore),
    );
    TestValidator.predicate(
      "snapshot has valid status_after",
      ["pending", "approved", "rejected"].includes(snapshot.statusAfter),
    );
    TestValidator.predicate(
      "snapshot has valid cancellationRequestId",
      snapshot.cancellationRequestId === retrievedRequest.id,
    );
  }
  // 7. Validate status-specific fields based on current status
  if (retrievedRequest.status === "approved") {
    TestValidator.predicate(
      "seller reviewer information exists for approved request",
      retrievedRequest.seller !== null,
    );
    TestValidator.predicate(
      "responded_at timestamp exists for approved request",
      retrievedRequest.respondedAt !== null,
    );
  }
}
