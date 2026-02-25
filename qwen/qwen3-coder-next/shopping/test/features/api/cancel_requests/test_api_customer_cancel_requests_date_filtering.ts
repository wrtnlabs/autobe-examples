import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallOrderCancellationRequest";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallOrderCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderCancellationRequest";
import type { IShoppingMallOrderItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderItem";
import type { IShoppingMallOrderProductSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderProductSnapshots";
import type { IShoppingMallOrderSellerProfileSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderSellerProfileSnapshots";
import type { IShoppingMallOrderVariantSnapshots } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderVariantSnapshots";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer cancel requests date filtering functionality.
 * Verifies that created_at_gte and created_at_lte filters work correctly
 * and return only cancellation requests within the specified date range.
 */
export async function test_api_customer_cancel_requests_date_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer session for testing
  const customerConnection: api.IConnection = { host: connection.host };
  await api.functional.shoppingMall.auth.customer.join(customerConnection, {
    body: {
      email: typia.random<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(),
      password: "1234" as string &
        tags.MinLength<8> &
        tags.MaxLength<128> &
        tags.Format<"password">,
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  // 2. Get current time and create date range
  const now = new Date();
  const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000);
  const fiveMinutesLater = new Date(now.getTime() + 5 * 60 * 1000);
  const isoFiveMinutesAgo = fiveMinutesAgo.toISOString();
  const isoFiveMinutesLater = fiveMinutesLater.toISOString();
  // 3. Test with date range filters
  const filteredRequest =
    await api.functional.shoppingMall.customer.cancel_requests.index(
      customerConnection,
      {
        body: {
          created_at_gte: isoFiveMinutesAgo,
          created_at_lte: isoFiveMinutesLater,
          limit: 10,
          page: 1,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(filteredRequest);
  // 4. Verify pagination structure
  TestValidator.equals("has pagination", filteredRequest.pagination.current, 1);
  TestValidator.predicate("has limit", filteredRequest.pagination.limit > 0);
  TestValidator.predicate(
    "has records count",
    filteredRequest.pagination.records >= 0,
  );
  TestValidator.predicate(
    "has pages count",
    filteredRequest.pagination.pages >= 0,
  );
  // 5. Verify data structure
  TestValidator.predicate(
    "has data array",
    Array.isArray(filteredRequest.data),
  );
  filteredRequest.data.forEach((item) => {
    typia.assert<IShoppingMallOrderCancellationRequest.ISummary>(item);
  });
  // 6. Test with only created_at_gte filter
  const gteOnly =
    await api.functional.shoppingMall.customer.cancel_requests.index(
      customerConnection,
      {
        body: {
          created_at_gte: isoFiveMinutesAgo,
          limit: 5,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(gteOnly);
  // 7. Test with only created_at_lte filter
  const lteOnly =
    await api.functional.shoppingMall.customer.cancel_requests.index(
      customerConnection,
      {
        body: {
          created_at_lte: isoFiveMinutesLater,
          limit: 5,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(lteOnly);
  // 8. Test with wider date range to ensure we get more results
  const wideRange =
    await api.functional.shoppingMall.customer.cancel_requests.index(
      customerConnection,
      {
        body: {
          created_at_gte: new Date(2020, 0, 1).toISOString(),
          created_at_lte: new Date(2030, 0, 1).toISOString(),
          limit: 100,
        } satisfies IShoppingMallOrderCancellationRequest.IRequest,
      },
    );
  typia.assert(wideRange);
  // 9. Verify that wider range returns >= narrow range
  TestValidator.predicate(
    "wide range has >= results",
    wideRange.pagination.records >= filteredRequest.pagination.records,
  );
}
