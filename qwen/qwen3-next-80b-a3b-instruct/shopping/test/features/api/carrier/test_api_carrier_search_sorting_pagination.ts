import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCarrier";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCarrier } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCarrier";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_carrier_search_sorting_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate via join
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Step 2: Construct search request with sorting and pagination parameters
  // Sort by creation date in descending order, page 2, limit 5
  const searchRequest: IShoppingMallCarrier.IRequest = {
    sortBy: "createdAt",
    order: "desc",
    page: 2,
    limit: 5,
  } satisfies IShoppingMallCarrier.IRequest;
  // Step 3: Call carrier search endpoint with admin connection
  const result: IPageIShoppingMallCarrier.ISummary =
    await api.functional.shoppingMall.admin.carriers.index(adminConnection, {
      body: searchRequest,
    });
  typia.assert(result);
  // Step 4: Validate pagination metadata
  TestValidator.equals(
    "pagination current page should be 2",
    result.pagination.current,
    2,
  );
  TestValidator.equals(
    "pagination limit should be 5",
    result.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "pagination records should be positive",
    result.pagination.records > 0,
  );
  TestValidator.predicate(
    "pagination pages should be positive",
    result.pagination.pages > 0,
  );
  // Step 5: Validate data consistency
  TestValidator.predicate(
    "result data should have exactly 5 records",
    result.data.length === 5,
  );
  TestValidator.predicate(
    "all carriers in result should have valid names",
    result.data.every((carrier) => carrier.name.length > 0),
  );
  // Note: Cannot validate sorting order by creation date because ISummary
  // does not contain a creation date field. The scenario has been rewritten
  // to test the protocol implementation with what is possible.
}
