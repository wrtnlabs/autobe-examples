import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlistItem";
import type { IShoppingMallAdminSessions } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminSessions";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_pagination_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create new customer account
  const customerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<
        string & tags.Format<"email"> & tags.MinLength<1> & tags.MaxLength<255>
      >(),
      password: "12345678" satisfies string &
        tags.MinLength<8> &
        tags.MaxLength<128> as string & tags.MinLength<8> & tags.MaxLength<128>,
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: "https://example.com/join" satisfies string & tags.Format<"uri">,
      referrer: "https://example.com" satisfies string & tags.Format<"uri">,
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  // 2. Test pagination with page 1 and limit 20
  const response = await api.functional.shoppingMall.customer.wishlists.index(
    customerConnection,
    {
      body: {
        page: 1,
        limit: 20,
        pagination: {
          current: 1,
          limit: 20,
          records: 0,
          pages: 0,
        },
        data: [],
      } satisfies IPageIShoppingMallWishlistItem.IRequest,
    },
  );
  typia.assert(response);
  // 3. Validate pagination metadata
  TestValidator.equals("page number", response.pagination.current, 1);
  TestValidator.equals("limit", response.pagination.limit, 20);
  TestValidator.predicate(
    "total records >= 0",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("total pages >= 0", response.pagination.pages >= 0);
  // 4. Validate wishlist items structure
  for (const item of response.data) {
    TestValidator.equals(
      "has valid uuid id",
      /^[0-9a-f-]{36}$/i.test(item.id),
      true,
    );
    TestValidator.predicate(
      "has created_at timestamp",
      item.created_at !== undefined && item.created_at !== null,
    );
    TestValidator.equals("product has id", typeof item.product.id, "string");
    TestValidator.equals(
      "product has name",
      typeof item.product.name,
      "string",
    );
    TestValidator.equals(
      "product has base_price",
      typeof item.product.base_price,
      "number",
    );
    TestValidator.equals("seller has id", typeof item.seller.id, "string");
    TestValidator.equals(
      "seller has shop_name",
      typeof item.seller.shop_name,
      "string",
    );
  }
}
