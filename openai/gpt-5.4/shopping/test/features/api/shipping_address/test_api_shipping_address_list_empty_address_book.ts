import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallShippingAddress";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallShippingAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallShippingAddress";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_shipping_address_list_empty_address_book(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  const request = {} satisfies IShoppingMallShippingAddress.IRequest;
  const page =
    await api.functional.shoppingMall.customer.shippingAddresses.index(
      customerConnection,
      {
        body: request,
      },
    );
  typia.assert(page);
  TestValidator.equals("empty address list", page.data.length, 0);
  TestValidator.equals("zero matching records", page.pagination.records, 0);
  TestValidator.equals("zero pages for empty result", page.pagination.pages, 0);
  TestValidator.predicate(
    "current page is non-negative",
    page.pagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", page.pagination.limit >= 0);
}
