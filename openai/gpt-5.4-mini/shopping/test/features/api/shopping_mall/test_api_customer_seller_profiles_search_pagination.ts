import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSellerProfile";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_seller_profiles_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password1234",
      href: "https://example.com",
      referrer: "https://example.com/referrer",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const search = RandomGenerator.alphabets(8);
  const firstPage: IPageIShoppingMallSellerProfile.ISummary =
    await api.functional.shoppingMall.customer.sellerProfiles.index(
      customerConnection,
      {
        body: {
          search,
          page: 1,
          limit: 5,
        } satisfies IShoppingMallSellerProfile.IRequest,
      },
    );
  typia.assert(firstPage);
  const secondPage: IPageIShoppingMallSellerProfile.ISummary =
    await api.functional.shoppingMall.customer.sellerProfiles.index(
      customerConnection,
      {
        body: {
          search,
          page: 2,
          limit: 5,
        } satisfies IShoppingMallSellerProfile.IRequest,
      },
    );
  typia.assert(secondPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, 5);
  TestValidator.predicate(
    "first page records are non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages are non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page size respects limit",
    firstPage.data.length <= firstPage.pagination.limit,
  );
  TestValidator.equals("second page current", secondPage.pagination.current, 2);
  TestValidator.equals("second page limit", secondPage.pagination.limit, 5);
  TestValidator.predicate(
    "second page records are non-negative",
    secondPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "second page pages are non-negative",
    secondPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "second page size respects limit",
    secondPage.data.length <= secondPage.pagination.limit,
  );
  TestValidator.equals(
    "pagination record count is stable",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  TestValidator.equals(
    "pagination page count is stable",
    firstPage.pagination.pages,
    secondPage.pagination.pages,
  );
  TestValidator.predicate(
    "first page rows match storefront search term",
    firstPage.data.every(
      (item) =>
        item.shopName.includes(search) || item.shopDescription.includes(search),
    ),
  );
  TestValidator.predicate(
    "second page rows match storefront search term",
    secondPage.data.every(
      (item) =>
        item.shopName.includes(search) || item.shopDescription.includes(search),
    ),
  );
  if (firstPage.data.length > 0 && secondPage.data.length > 0) {
    TestValidator.predicate(
      "search results should not repeat across pages",
      !ArrayUtil.has(firstPage.data, (left) =>
        ArrayUtil.has(secondPage.data, (right) => right.id === left.id),
      ),
    );
  }
}
