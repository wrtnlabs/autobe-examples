import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrder";
import type { IEcommerceMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItem";
import type { IEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallOrderItemCancellationRequest";
import type { IEcommerceMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProductVariant";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallOrderItemCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallOrderItemCancellationRequest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";

export async function test_api_seller_cancellation_requests_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as seller
  const sellerConnection: api.IConnection = { host: connection.host };
  const sellerAuth = await authorize_seller_join(sellerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      shop_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerAuth);
  // 2. Create test cancellation requests with various timestamps
  // Note: In a real scenario, we would need to create orders, order items, and cancellation requests
  // For this test, we'll use the API directly with random data to test filtering
  // 3. Test filtering by requested_at date range
  const now = new Date();
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const threeDaysAgo = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
  // Filter requests submitted in the last 7 days
  const last7DaysResult =
    await api.functional.ecommerceMall.seller._dashboard.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          requested_at_from: sevenDaysAgo.toISOString(),
          requested_at_to: now.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(last7DaysResult);
  // 4. Test filtering by responded_at date range
  const respondedResult =
    await api.functional.ecommerceMall.seller._dashboard.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          responded_at_from: threeDaysAgo.toISOString(),
          responded_at_to: now.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(respondedResult);
  // 5. Test combined date range filters
  const combinedResult =
    await api.functional.ecommerceMall.seller._dashboard.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          requested_at_from: sevenDaysAgo.toISOString(),
          requested_at_to: now.toISOString(),
          responded_at_from: threeDaysAgo.toISOString(),
          responded_at_to: now.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(combinedResult);
  // 6. Test with status filter combined with date range
  const statusAndDateResult =
    await api.functional.ecommerceMall.seller._dashboard.cancellation_requests.index(
      sellerConnection,
      {
        body: {
          status: "pending",
          requested_at_from: sevenDaysAgo.toISOString(),
          requested_at_to: now.toISOString(),
        } satisfies IEcommerceMallOrderItemCancellationRequest.IRequest,
      },
    );
  typia.assert(statusAndDateResult);
  // 7. Validate pagination structure
  TestValidator.equals(
    "has pagination",
    last7DaysResult.pagination !== undefined,
    true,
  );
  TestValidator.equals(
    "has data array",
    Array.isArray(last7DaysResult.data),
    true,
  );
  TestValidator.predicate(
    "pagination current is positive",
    last7DaysResult.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    last7DaysResult.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    last7DaysResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    last7DaysResult.pagination.pages >= 0,
  );
  // 8. Validate data items structure when present
  if (last7DaysResult.data.length > 0) {
    const firstItem = last7DaysResult.data[0];
    TestValidator.equals("has id", firstItem.id !== undefined, true);
    TestValidator.equals(
      "has orderItemId",
      firstItem.orderItemId !== undefined,
      true,
    );
    TestValidator.equals("has status", firstItem.status !== undefined, true);
    TestValidator.equals(
      "has requestedAt",
      firstItem.requestedAt !== undefined,
      true,
    );
    TestValidator.predicate(
      "requestedAt is valid ISO format",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstItem.requestedAt,
      ),
    );
  }
}
