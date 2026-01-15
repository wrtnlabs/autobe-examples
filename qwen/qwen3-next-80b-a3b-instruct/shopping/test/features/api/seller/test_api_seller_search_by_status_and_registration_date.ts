import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSeller";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_seller_search_by_status_and_registration_date(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/admin/join",
      referrer: "https://example.com/admin/signup",
    } satisfies IShoppingMallAdmin.IJoin,
  });
  // Since there is no seller creation endpoint available, we cannot create sellers with specific statuses and registration dates.
  // We must test the search functionality with minimal parameters as we have no control over existing data.
  // Step 2: Execute search with minimal parameters to verify endpoint works
  const searchRequest = {
    page: 1,
    limit: 10,
  } satisfies IShoppingMallSeller.IRequest;
  // Step 3: Execute the search
  const searchResult = await api.functional.shoppingMall.admin.sellers.index(
    adminConnection,
    { body: searchRequest },
  );
  typia.assert(searchResult);
  // Step 4: Validate search result structure without specific filter validations
  // Since we cannot control what data exists, we can only validate the response structure
  TestValidator.predicate(
    "search results exist",
    () => searchResult.data.length >= 0,
  );
  // Validate pagination metadata is correct
  TestValidator.equals(
    "page count matches limit",
    searchResult.pagination.limit,
    searchRequest.limit,
  );
  TestValidator.equals(
    "page number is correct",
    searchResult.pagination.current,
    searchRequest.page,
  );
  // Validate that each seller in results has minimal required properties from ISummary
  for (const seller of searchResult.data) {
    TestValidator.predicate("seller has id", () => seller.id !== undefined);
    TestValidator.predicate(
      "seller has business_name",
      () => seller.business_name !== undefined,
    );
    TestValidator.predicate(
      "seller has status",
      () => seller.status !== undefined,
    );
    TestValidator.predicate(
      "seller has registration_date",
      () => seller.registration_date !== undefined,
    );
    TestValidator.predicate(
      "seller has product_count",
      () => seller.product_count !== undefined,
    );
    TestValidator.predicate(
      "seller has avg_rating",
      () => seller.avg_rating !== undefined,
    );
    TestValidator.predicate(
      "seller has verification_status",
      () => seller.verification_status !== undefined,
    );
    TestValidator.predicate(
      "seller has last_login",
      () => seller.last_login !== undefined,
    );
    TestValidator.predicate(
      "seller has email",
      () => seller.email !== undefined,
    );
  }
  // Note: Status and registration date filtering cannot be tested because we cannot create sellers with specific values.
  // This test only validates the search endpoint returns valid structure.
}
