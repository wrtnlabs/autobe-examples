import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCancellationRequest";
import type { IShoppingMallCancellationRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCancellationRequest";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_cancellation_requests_filtered_query(
  connection: api.IConnection,
): Promise<void> {
  // 1. Customer joins and gets authorized connection
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  customerConnection.headers = { Authorization: authorized.token.access };
  // 2. Perform an unfiltered request to fetch cancellation requests
  const response =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      { body: {} },
    );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.predicate(
    "pagination current >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit >= 0",
    response.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages >= 0",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages consistent",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      (response.pagination.records === 0 && response.pagination.pages === 0),
  );
  // 4. Validate each data item structure
  for (const item of response.data) {
    typia.assert(item);
  }
  // 5. Test pagination: request limit 2, page 1 then page 2, check pagination metadata
  const limit = 2;
  // Page 1
  const page1 =
    await api.functional.shoppingMall.customer.cancellation_requests.index(
      customerConnection,
      {
        body: { limit, page: 1 },
      },
    );
  typia.assert(page1);
  TestValidator.predicate(
    "page1 pagination current >= 1",
    page1.pagination.current >= 1,
  );
  TestValidator.predicate(
    "page1 pagination limit >= 0",
    page1.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "page1 pagination records >= 0",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page1 pagination pages >= 0",
    page1.pagination.pages >= 0,
  );
  // Page 2
  if (page1.pagination.pages >= 2) {
    const page2 =
      await api.functional.shoppingMall.customer.cancellation_requests.index(
        customerConnection,
        { body: { limit, page: 2 } },
      );
    typia.assert(page2);
    TestValidator.predicate(
      "page2 pagination current >= 1",
      page2.pagination.current >= 1,
    );
    TestValidator.predicate(
      "page2 pagination limit >= 0",
      page2.pagination.limit >= 0,
    );
    TestValidator.predicate(
      "page2 pagination records >= 0",
      page2.pagination.records >= 0,
    );
    TestValidator.predicate(
      "page2 pagination pages >= 0",
      page2.pagination.pages >= 0,
    );
  }
}
