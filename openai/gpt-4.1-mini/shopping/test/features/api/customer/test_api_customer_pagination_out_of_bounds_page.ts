import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomer";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_pagination_out_of_bounds_page(
  connection: api.IConnection,
): Promise<void> {
  // Test edge case where administrator requests page number exceeding maximum available pages, validating the system responds gracefully with no data or empty list, valid pagination info, and authorization is enforced.
  // 1. Administrator joins and gets authorized
  const adminConnection: api.IConnection = { host: connection.host };
  const administrator = await authorize_administrator_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(10) + "@example.com",
      password: "passwordpassword",
    },
  });
  typia.assert(administrator);
  adminConnection.headers = { Authorization: administrator.token.access };
  // 2. Request first page with a small limit to get pagination info
  const firstPageRequest = {
    page: 1,
    limit: 2,
  } satisfies IShoppingMallCustomer.IRequest;
  const firstPageResponse: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: firstPageRequest,
      },
    );
  typia.assert(firstPageResponse);
  // 3. Calculate an out-of-bounds page number (one greater than max pages; or at least 2 if empty)
  const outOfBoundsPageNum = Math.max(
    firstPageResponse.pagination.pages + 1,
    2,
  );
  // 4. Request out-of-bounds page
  const outOfBoundsRequest = {
    page: outOfBoundsPageNum,
    limit: 2,
  } satisfies IShoppingMallCustomer.IRequest;
  const outOfBoundsResponse: IPageIShoppingMallCustomer.ISummary =
    await api.functional.shoppingMall.administrator.customers.index(
      adminConnection,
      {
        body: outOfBoundsRequest,
      },
    );
  typia.assert(outOfBoundsResponse);
  // 5. Validate response pagination info
  TestValidator.predicate(
    "pagination current page matches requested",
    outOfBoundsResponse.pagination.current === outOfBoundsPageNum,
  );
  TestValidator.predicate(
    "pagination pages is not less than current",
    outOfBoundsResponse.pagination.pages >=
      outOfBoundsResponse.pagination.current,
  );
  TestValidator.predicate(
    "pagination limit matches requested",
    outOfBoundsResponse.pagination.limit === 2,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    outOfBoundsResponse.pagination.records >= 0,
  );
  // 6. Validate that data array is empty (since page is out of bounds)
  TestValidator.equals(
    "data array empty for out-of-bounds page",
    outOfBoundsResponse.data,
    [],
  );
  // 7. Authorization enforcement
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // call without auth headers
  await TestValidator.httpError("authorization required", 401, async () => {
    await api.functional.shoppingMall.administrator.customers.index(
      unauthorizedConnection,
      {
        body: outOfBoundsRequest,
      },
    );
  });
}
