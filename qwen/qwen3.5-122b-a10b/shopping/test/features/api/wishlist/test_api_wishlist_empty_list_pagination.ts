import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_wishlist_empty_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customer);
  // 2. Call wishlist index endpoint with empty wishlist request
  const wishlist = await api.functional.ecommerceMall.customer.wishlists.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 10,
        sort: "created_at",
        order: "desc",
      } satisfies IEcommerceMallWishlist.IRequest,
    },
  );
  typia.assert(wishlist);
  // 3. Validate empty wishlist response structure
  TestValidator.equals("data array is empty", wishlist.data.length, 0);
  TestValidator.equals("current page is 1", wishlist.pagination.current, 1);
  TestValidator.equals("records count is 0", wishlist.pagination.records, 0);
  TestValidator.equals("pages count is 0", wishlist.pagination.pages, 0);
  TestValidator.equals("limit matches request", wishlist.pagination.limit, 10);
  // 4. Test with different pagination parameters
  const wishlistPage2 =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 20,
          sort: "updated_at",
          order: "asc",
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistPage2);
  TestValidator.equals(
    "data array is empty on page 2",
    wishlistPage2.data.length,
    0,
  );
  TestValidator.equals(
    "current page is 2",
    wishlistPage2.pagination.current,
    2,
  );
  TestValidator.equals(
    "records count is 0 on page 2",
    wishlistPage2.pagination.records,
    0,
  );
  TestValidator.equals(
    "pages count is 0 on page 2",
    wishlistPage2.pagination.pages,
    0,
  );
  TestValidator.equals(
    "limit matches request on page 2",
    wishlistPage2.pagination.limit,
    20,
  );
}
