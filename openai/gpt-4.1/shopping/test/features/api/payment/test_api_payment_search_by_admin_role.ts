import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPayment";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPayment } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPayment";

/**
 * Test that a platform admin can search and paginate shopping mall payment
 * records using advanced filtering options (status, method_type, currency,
 * amount range, date range, customer/provider ID, sorting, and pagination). The
 * scenario ensures only authenticated admin actors can access the payments
 * search and receive results. Validates correct filter application and response
 * pagination for administrative reconciliation and reporting use cases.
 *
 * Steps:
 *
 * 1. Register a new admin and authenticate
 * 2. As admin, search payments with default (no filter)
 * 3. As admin, search payments with advanced filtering/sorting/pagination criteria
 * 4. Validate response type and pagination structure
 * 5. Validate that unauthenticated requests are rejected
 */
export async function test_api_payment_search_by_admin_role(
  connection: api.IConnection,
) {
  // 1. Register a new admin and authenticate
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(10) + "A!1";
  const name = RandomGenerator.name();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email,
        password: password satisfies string as string,
        name,
      },
    });
  typia.assert(admin);

  // 2. Search payments with no filters (default search)
  const defaultRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
  } satisfies IShoppingMallPayment.IRequest;
  const defaultResponse: IPageIShoppingMallPayment.ISummary =
    await api.functional.shoppingMall.admin.payments.index(connection, {
      body: defaultRequest,
    });
  typia.assert(defaultResponse);
  TestValidator.equals(
    "page number matches",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit matches", defaultResponse.pagination.limit, 10);
  TestValidator.predicate(
    "has data array",
    Array.isArray(defaultResponse.data),
  );

  // 3. Advanced filtering + sorting + pagination
  const filterRequest = {
    status: RandomGenerator.pick([
      "pending",
      "completed",
      "failed",
      "refunded",
      "cancelled",
    ]),
    method_type: RandomGenerator.pick(["card", "e-wallet", "bank_transfer"]),
    currency: RandomGenerator.pick(["USD", "KRW", "EUR"]),
    min_amount: Math.floor(Math.random() * 1000),
    max_amount: Math.floor(Math.random() * 9000) + 1000,
    requested_from: new Date(
      Date.now() - 30 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    requested_to: new Date().toISOString(),
    page: 2 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 5 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    order_by: RandomGenerator.pick(["requested_at", "amount", "status"]),
    order_dir: RandomGenerator.pick(["asc", "desc"]),
  } satisfies IShoppingMallPayment.IRequest;
  const filteredResponse: IPageIShoppingMallPayment.ISummary =
    await api.functional.shoppingMall.admin.payments.index(connection, {
      body: filterRequest,
    });
  typia.assert(filteredResponse);
  TestValidator.equals(
    "limit matches filter",
    filteredResponse.pagination.limit,
    5,
  );
  TestValidator.equals(
    "page matches filter",
    filteredResponse.pagination.current,
    2,
  );
  TestValidator.predicate(
    "records is non-negative",
    filteredResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages is non-negative",
    filteredResponse.pagination.pages >= 0,
  );

  // 4. Validate only admin can access (unauthenticated connection should be rejected)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthenticated user cannot access admin payment search",
    async () => {
      await api.functional.shoppingMall.admin.payments.index(unauthConn, {
        body: defaultRequest,
      });
    },
  );
}
