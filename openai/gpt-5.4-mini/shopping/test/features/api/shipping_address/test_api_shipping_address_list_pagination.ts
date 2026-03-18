import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipping_address_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = `Pw${RandomGenerator.alphabets(10)}1!`;
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href: "https://example.com/register",
      referrer: "https://example.com/",
      ip: "127.0.0.1",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(authorized);
  const limit = 2;
  const firstPage =
    await api.functional.shoppingMall.customer.shipping_addresses.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit,
        } satisfies IShoppingMallShippingAddress.IRequest,
      },
    );
  typia.assert(firstPage);
  TestValidator.equals("first page current", firstPage.pagination.current, 1);
  TestValidator.equals("first page limit", firstPage.pagination.limit, limit);
  TestValidator.predicate(
    "first page records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "first page pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "first page data within limit",
    firstPage.data.length <= limit,
  );
  if (firstPage.pagination.pages > 1) {
    const secondPage =
      await api.functional.shoppingMall.customer.shipping_addresses.index(
        customerConnection,
        {
          body: {
            page: 2,
            limit,
          } satisfies IShoppingMallShippingAddress.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page current",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "second page limit",
      secondPage.pagination.limit,
      limit,
    );
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
    TestValidator.predicate(
      "second page data within limit",
      secondPage.data.length <= limit,
    );
    TestValidator.predicate("pages do not overlap", () => {
      const firstIds = new Set(firstPage.data.map((item) => item.id));
      return secondPage.data.every((item) => !firstIds.has(item.id));
    });
  } else {
    TestValidator.predicate(
      "single page result is valid when only one page exists",
      firstPage.pagination.pages <= 1,
    );
  }
}
