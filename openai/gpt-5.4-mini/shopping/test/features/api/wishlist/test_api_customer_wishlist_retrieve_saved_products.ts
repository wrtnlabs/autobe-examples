import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_wishlist_retrieve_saved_products(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IShoppingMallCustomer.IJoin,
  });
  const page = await api.functional.shoppingMall.customer.wishlists.index(
    customerConnection,
    { body: {} satisfies IShoppingMallWishlist.IRequest },
  );
  typia.assert(page);
  TestValidator.predicate(
    "wishlist pagination current is valid",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "wishlist pagination limit is valid",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "wishlist pagination records is valid",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "wishlist pagination pages is valid",
    page.pagination.pages >= 0,
  );
  TestValidator.equals(
    "wishlist records match data length on an empty page",
    page.pagination.records,
    page.data.length,
  );
  TestValidator.equals(
    "wishlist pages are zero when there are no saved products",
    page.pagination.records === 0,
    page.pagination.pages === 0,
  );
  TestValidator.equals(
    "wishlist data is empty for a new customer",
    page.data.length,
    0,
  );
  for (const item of page.data) {
    typia.assert(item);
    typia.assert(item.product);
    TestValidator.predicate(
      "wishlist item exposes product summary id",
      item.product.id.length > 0,
    );
    TestValidator.predicate(
      "wishlist item exposes product summary name",
      item.product.name.length > 0,
    );
    TestValidator.predicate(
      "wishlist item exposes product summary description",
      item.product.description.length > 0,
    );
    TestValidator.predicate(
      "wishlist item exposes product summary base price",
      item.product.basePrice >= 0,
    );
  }
}
