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

export async function test_api_customer_seller_profiles_listing(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "Test1234!",
      href: "http://localhost",
      referrer: "http://localhost",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const emptySearch = RandomGenerator.alphabets(32);
  const emptyPage =
    await api.functional.shoppingMall.customer.sellerProfiles.index(
      customerConnection,
      {
        body: {
          search: emptySearch,
          page: 1,
          limit: 10,
        } satisfies IShoppingMallSellerProfile.IRequest,
      },
    );
  typia.assert(emptyPage);
  TestValidator.equals(
    "empty search current page",
    emptyPage.pagination.current,
    1,
  );
  TestValidator.equals("empty search limit", emptyPage.pagination.limit, 10);
  TestValidator.equals("empty search records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty search pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty search data length", emptyPage.data.length, 0);
  const page = await api.functional.shoppingMall.customer.sellerProfiles.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies IShoppingMallSellerProfile.IRequest,
    },
  );
  typia.assert(page);
  TestValidator.equals("listing current page", page.pagination.current, 1);
  TestValidator.equals("listing limit", page.pagination.limit, 10);
  TestValidator.predicate(
    "listing records non-negative",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "listing pages non-negative",
    page.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "listing data length within limit",
    page.data.length <= page.pagination.limit,
  );
  TestValidator.predicate(
    "listing data length within records",
    page.data.length <= page.pagination.records ||
      page.pagination.records === 0,
  );
  if (page.data.length >= 2) {
    for (let i = 1; i < page.data.length; ++i) {
      TestValidator.predicate(
        "seller profiles sorted by updated_at descending",
        page.data[i - 1].updated_at >= page.data[i].updated_at,
      );
    }
  }
}
