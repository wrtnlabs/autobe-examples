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

export async function test_api_customer_wishlist_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>>(),
      password: "1234" as string &
        tags.MinLength<8> &
        tags.MaxLength<128> &
        tags.Format<"password">,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join" as string & tags.Format<"uri">,
      referrer: "https://example.com/home" as string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Retrieve the authenticated customer's wishlist items
  const wishlistResponse =
    await api.functional.shoppingMall.customer.wishlist.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 20,
        } satisfies IShoppingMallCustomerWishlist.IRequest,
      },
    );
  typia.assert(wishlistResponse);
  // 3. Verify pagination metadata
  TestValidator.equals(
    "current page is 1",
    wishlistResponse.pagination.current,
    1,
  );
  TestValidator.equals("limit is 20", wishlistResponse.pagination.limit, 20);
  TestValidator.predicate(
    "records >= 0",
    wishlistResponse.pagination.records >= 0,
  );
  TestValidator.predicate("pages >= 0", wishlistResponse.pagination.pages >= 0);
  // 4. Verify data array structure
  typia.assert<IShoppingMallCustomerWishlist.ISummary[]>(wishlistResponse.data);
  // 5. Verify each wishlist item contains required fields
  for (const item of wishlistResponse.data) {
    typia.assert<string & tags.Format<"uuid">>(item.id);
    typia.assert<string & tags.Format<"date-time">>(item.added_at);
    typia.assert<IShoppingMallProduct.ISummary>(item.product);
  }
  // 6. Verify product information structure
  for (const item of wishlistResponse.data) {
    const product = item.product;
    typia.assert<string & tags.Format<"uuid">>(product.id);
    typia.assert<string>(product.name);
    typia.assert<number>(product.base_price);
    typia.assert<boolean>(product.is_deleted);
    typia.assert<IShoppingMallSeller.ISummary>(product.seller);
    typia.assert<IShoppingMallCategory.ISummary>(product.category);
  }
  // 7. Validate pagination accuracy
  const expectedPages =
    wishlistResponse.pagination.records === 0
      ? 0
      : Math.ceil(
          wishlistResponse.pagination.records /
            wishlistResponse.pagination.limit,
        );
  TestValidator.equals(
    "total pages calculated correctly",
    wishlistResponse.pagination.pages,
    expectedPages,
  );
}