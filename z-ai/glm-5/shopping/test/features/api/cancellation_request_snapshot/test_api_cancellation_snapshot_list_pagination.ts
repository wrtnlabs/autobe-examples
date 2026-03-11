import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequestSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequestSnapshot";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the pagination functionality for customer cancellation request snapshots.
 *
 * This test verifies that authenticated customers can successfully retrieve
 * their cancellation request snapshots with proper pagination structure.
 */
export async function test_api_cancellation_snapshot_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a customer
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: "https://test.example.com/cancellations",
      referrer: "https://test.example.com",
    },
  });
  // 2. Call the cancellation request snapshots list endpoint with pagination
  const snapshots =
    await api.functional.shoppingMall.customer.cancellation_request_snapshots.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IShoppingMallCancellationRequestSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 3. Verify pagination metadata is present (business logic check)
  TestValidator.predicate(
    "pagination metadata present",
    snapshots.pagination !== null && snapshots.pagination !== undefined,
  );
  // 4. Verify data array exists (business logic check)
  TestValidator.predicate("data array present", Array.isArray(snapshots.data));
  // 5. If snapshots exist, verify sorting by created_at descending
  if (snapshots.data.length > 1) {
    const dates = snapshots.data.map((s) => new Date(s.created_at).getTime());
    const isDescending = dates.every(
      (date, i) => i === 0 || dates[i - 1] >= date,
    );
    TestValidator.predicate(
      "snapshots sorted by created_at descending",
      isDescending,
    );
  }
}
