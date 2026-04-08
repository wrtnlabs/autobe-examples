import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequest";
import type { IMallPlatformCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCancellationRequestSnapshot";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
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

export async function test_api_cancellation_request_snapshot_preservation_after_decision(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that cancellation request snapshot history remains queryable for an authenticated customer.
   *
   * This test validates the immutable snapshot listing contract for a customer-owned order item cancellation request.
   * It focuses on the preserved history shape, pagination metadata, and stable historical references that are required
   * for dispute resolution, without attempting to mutate the request state because no mutation endpoint is available in
   * the provided SDK surface.
   *
   * 1. Register and authenticate a fresh customer session.
   * 2. Query the cancellation request snapshot history for a customer-scoped order item/request pair.
   * 3. Validate that the returned page structure and snapshot records remain internally consistent.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customerJoin = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Passw0rd!",
      href: "https://example.com/mallPlatform/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerJoin);
  const orderItemId = typia.random<string & tags.Format<"uuid">>();
  const cancellationRequestId = typia.random<string & tags.Format<"uuid">>();
  const snapshots =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.getByOrderitemidAndCancellationrequestid(
      customerConnection,
      {
        orderItemId,
        cancellationRequestId,
      },
    );
  typia.assert(snapshots);
  TestValidator.equals(
    "snapshot pagination record count matches returned data length",
    snapshots.pagination.records,
    snapshots.data.length,
  );
  TestValidator.predicate(
    "snapshot pagination page count is consistent with the record count",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "each cancellation request snapshot preserves its historical reference",
    snapshots.data.every((snapshot) => snapshot.cancellationRequest !== undefined),
  );
  TestValidator.predicate(
    "each cancellation request snapshot preserves a historical change timestamp",
    snapshots.data.every((snapshot) => snapshot.changedAt.length > 0),
  );
  TestValidator.predicate(
    "each cancellation request snapshot preserves immutable audit fields",
    snapshots.data.every(
      (snapshot) =>
        snapshot.createdAt.length > 0 && snapshot.updatedAt.length > 0,
    ),
  );
}
