import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformCustomer";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_customer_account_pagination_boundary(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Validate administrator customer pagination boundary behavior.
   *
   * Verifies that the administrative customer registry returns stable,
   * page-based slices when the dataset spans multiple pages, and that requests
   * beyond the last page resolve to an empty page instead of failing.
   *
   * 1. Authenticate as an administrator using an isolated connection.
   * 2. Request the first page of the customer registry with a small page size.
   * 3. Request the second page using the same criteria.
   * 4. Request a page beyond the last available page and confirm the response is
   *    a valid empty page.
   * 5. Validate pagination metadata and ensure page slices differ when multiple
   *    records are available.
   */
  const administratorConnection: api.IConnection = { host: connection.host };
  await authorize_administrator_join(administratorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IMallPlatformAdministrator.IJoin,
  });
  const request: IMallPlatformCustomer.IRequest = {
    page: 1,
    limit: 2,
    sort: "created_at",
    order: "desc",
  };
  const firstPage =
    await api.functional.mallPlatform.administrator.customers.index(
      administratorConnection,
      { body: request },
    );
  typia.assert(firstPage);
  const secondPage =
    await api.functional.mallPlatform.administrator.customers.index(
      administratorConnection,
      {
        body: {
          ...request,
          page: 2,
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(secondPage);
  const boundaryPageNumber =
    firstPage.pagination.pages > 0 ? firstPage.pagination.pages + 1 : 2;
  const boundaryPage =
    await api.functional.mallPlatform.administrator.customers.index(
      administratorConnection,
      {
        body: {
          ...request,
          page: boundaryPageNumber,
        } satisfies IMallPlatformCustomer.IRequest,
      },
    );
  typia.assert(boundaryPage);
  TestValidator.equals(
    "first page current page",
    firstPage.pagination.current,
    1,
  );
  TestValidator.equals("first page limit", firstPage.pagination.limit, 2);
  TestValidator.predicate(
    "first page total records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page total pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "second page current page",
    secondPage.pagination.current,
    2,
  );
  TestValidator.equals("second page limit", secondPage.pagination.limit, 2);
  TestValidator.equals(
    "second page total records",
    secondPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "second page total pages",
    secondPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals(
    "boundary page current page",
    boundaryPage.pagination.current,
    boundaryPageNumber,
  );
  TestValidator.equals("boundary page limit", boundaryPage.pagination.limit, 2);
  TestValidator.equals(
    "boundary page total records",
    boundaryPage.pagination.records,
    firstPage.pagination.records,
  );
  TestValidator.equals(
    "boundary page total pages",
    boundaryPage.pagination.pages,
    firstPage.pagination.pages,
  );
  TestValidator.equals(
    "boundary page data is empty",
    boundaryPage.data.length,
    0,
  );
  if (
    firstPage.pagination.pages > 0 &&
    firstPage.data.length > 0 &&
    secondPage.data.length > 0
  ) {
    TestValidator.notEquals(
      "first and second page data slices differ",
      firstPage.data.map((customer) => customer.id),
      secondPage.data.map((customer) => customer.id),
    );
  }
  if (firstPage.pagination.pages === 0) {
    TestValidator.equals(
      "empty dataset first page is empty",
      firstPage.data.length,
      0,
    );
    TestValidator.equals(
      "empty dataset second page is empty",
      secondPage.data.length,
      0,
    );
  }
}
