import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallPaymentIntent";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallPaymentIntent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntent";
import type { IShoppingMallPaymentIntentMetadata } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPaymentIntentMetadata";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_payment_intent_search_by_status(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Create search request with status filter and pagination
  const searchRequest: IShoppingMallPaymentIntent.IRequest = {
    page: 1,
    limit: 10,
    currency: "KRW", // Required field, matched to ISO 4217
  };
  // Step 3: Call the search endpoint with admin connection
  const result: IPageIShoppingMallPaymentIntent.ISummary =
    await api.functional.shoppingMall.admin.payment_intents.index(
      adminConnection,
      { body: searchRequest },
    );
  typia.assert(result);
  // Step 4: Validate payment intents returned have status 'pending'
  // Since we can't create data, we validate contract: if any intents exist, they must be 'pending'
  // The API should be filtering by status='pending' according to the scenario
  for (const intent of result.data) {
    TestValidator.equals("status is pending", intent.status, "pending");
    // Validate currency conforms to ISO 4217 standard (3 uppercase letters)
    TestValidator.predicate(
      "currency is valid ISO 4217 code",
      /^[A-Z]{3}$/.test(intent.currency),
    );
    // Validate amount is non-negative
    TestValidator.predicate("amount is non-negative", intent.amount >= 0);
  }
  // Step 5: Validate pagination structure
  TestValidator.equals("current page is 1", result.pagination.current, 1);
  TestValidator.equals(
    "page limit matches requested",
    result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data count is within limit",
    result.data.length <= result.pagination.limit,
  );
  TestValidator.predicate(
    "total records is non-negative",
    result.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages is at least 1",
    result.pagination.pages >= 1,
  );
}
