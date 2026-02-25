import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerWishlist";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerWishlist";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customerCreds = {
    email: typia.random<
      string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
    >(),
    password: "1234" as string &
      tags.MinLength<8> &
      tags.MaxLength<128> &
      tags.Format<"password">,
    display_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: "https://example.com/join" as string & tags.Format<"uri">,
    referrer: "https://example.com/referrer" as string & tags.Format<"uri">,
    ip: "127.0.0.1" as string & tags.Format<"ipv4">,
  } satisfies IShoppingMallCustomer.IJoin;
  const customerAuth = await authorize_customer_join(customerConnection, {
    body: customerCreds,
  });
  typia.assert(customerAuth);
  // 2. Retrieve wishlist with default parameters (body must be provided)
  const pagination1 = await api.functional.shoppingMall.customer.wishlist.index(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(pagination1);
  // 3. Verify pagination metadata
  TestValidator.equals("default page is 1", pagination1.pagination.current, 1);
  TestValidator.equals("default limit is 20", pagination1.pagination.limit, 20);
  TestValidator.equals("total records is 0", pagination1.pagination.records, 0);
  TestValidator.equals("total pages is 0", pagination1.pagination.pages, 0);
  // 4. Verify data array is empty
  TestValidator.equals("first page has 0 items", pagination1.data.length, 0);
  // 5. Test different limit value
  const pagination2 = await api.functional.shoppingMall.customer.wishlist.index(
    customerConnection,
    {
      body: { limit: 3 },
    },
  );
  typia.assert(pagination2);
  TestValidator.equals("custom limit 3", pagination2.pagination.limit, 3);
  TestValidator.equals(
    "custom limit page 1",
    pagination2.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit records 0",
    pagination2.pagination.records,
    0,
  );
  TestValidator.equals("custom limit pages 0", pagination2.pagination.pages, 0);
  TestValidator.equals("custom limit has 0 items", pagination2.data.length, 0);
  // 6. Test page parameter
  const pagination3 = await api.functional.shoppingMall.customer.wishlist.index(
    customerConnection,
    {
      body: { page: 2, limit: 5 },
    },
  );
  typia.assert(pagination3);
  TestValidator.equals("page 2", pagination3.pagination.current, 2);
  TestValidator.equals("limit 5", pagination3.pagination.limit, 5);
  TestValidator.equals("page 2 records 0", pagination3.pagination.records, 0);
  TestValidator.equals("page 2 pages 0", pagination3.pagination.pages, 0);
}
