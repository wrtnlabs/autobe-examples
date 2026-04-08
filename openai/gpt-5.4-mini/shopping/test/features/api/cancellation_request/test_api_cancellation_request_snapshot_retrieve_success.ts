import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_cancellation_request_snapshot_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test that an authenticated customer can access the cancellation request snapshot retrieval endpoint.
   *
   * This test verifies the customer authentication prerequisite and confirms the snapshot retrieval
   * endpoint can be invoked with UUID-shaped identifiers under a customer session. It focuses on the
   * authenticated access path and the immutable read contract of the snapshot endpoint.
   *
   * 1. Register and authenticate a customer session.
   * 2. Call the cancellation request snapshot retrieval endpoint with valid UUID-shaped identifiers.
   * 3. Validate that the response is a well-formed immutable snapshot payload.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(authorized);
  const output =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.at(
      customerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
        snapshotId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.predicate("snapshot id is present", output.id.length > 0);
  TestValidator.predicate(
    "snapshot status is present",
    output.snapshotStatus.length > 0,
  );
  TestValidator.predicate(
    "cancellation request summary is present",
    output.cancellationRequest !== null &&
      output.cancellationRequest !== undefined,
  );
}
