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

export async function test_api_cancellation_request_snapshot_empty_history(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies that the cancellation-request snapshot history endpoint returns an
   * empty paginated collection when no snapshots have been preserved yet.
   *
   * This smoke test validates the response contract for a customer-scoped
   * snapshot-history lookup using UUID identifiers. It ensures the endpoint
   * returns a paginated snapshot page and that the empty-history case is
   * represented consistently through zero records, zero pages, and an empty
   * data array.
   *
   * 1. Create a customer-authenticated connection.
   * 2. Call the snapshot-history endpoint with UUID identifiers.
   * 3. Validate the paginated response structure.
   * 4. Confirm the history is empty and pagination metadata is zeroed.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const output =
    await api.functional.mallPlatform.customer.orderItems.cancellationRequests.snapshots.index(
      customerConnection,
      {
        orderItemId: typia.random<string & tags.Format<"uuid">>(),
        cancellationRequestId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  typia.assert(output);
  TestValidator.equals(
    "snapshot history should be empty",
    output.data.length,
    0,
  );
  TestValidator.equals(
    "pagination current should be first page",
    output.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination records should be zero",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "pagination pages should be zero",
    output.pagination.pages,
    0,
  );
}
