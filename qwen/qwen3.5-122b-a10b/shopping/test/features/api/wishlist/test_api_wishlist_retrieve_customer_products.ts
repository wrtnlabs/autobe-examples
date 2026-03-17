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

export async function test_api_wishlist_retrieve_customer_products(
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
  // 2. Retrieve wishlist with default pagination
  const wishlist: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
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
  // 3. Validate pagination metadata
  TestValidator.equals("current page is 1", wishlist.pagination.current, 1);
  TestValidator.equals("limit is 10", wishlist.pagination.limit, 10);
  TestValidator.predicate(
    "records count is non-negative",
    wishlist.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    wishlist.pagination.pages >= 0,
  );
  // 4. Validate wishlist entries structure
  for (const entry of wishlist.data) {
    typia.assert(entry);
    // Validate wishlist entry fields
    TestValidator.predicate("has valid id", typeof entry.id === "string");
    TestValidator.predicate(
      "has valid created_at",
      typeof entry.created_at === "string",
    );
    TestValidator.predicate(
      "has valid updated_at",
      typeof entry.updated_at === "string",
    );
    TestValidator.predicate(
      "active is boolean",
      typeof entry.active === "boolean",
    );
    // Validate product summary
    const product = entry.product;
    typia.assert(product);
    TestValidator.predicate(
      "product has valid id",
      typeof product.id === "string",
    );
    TestValidator.predicate(
      "product has name",
      typeof product.name === "string",
    );
    TestValidator.predicate(
      "product has basePrice",
      typeof product.basePrice === "number",
    );
    TestValidator.predicate(
      "product has mainImageUrl",
      typeof product.mainImageUrl === "string",
    );
    TestValidator.predicate(
      "product has averageRating",
      typeof product.averageRating === "number",
    );
    TestValidator.predicate(
      "product has reviewCount",
      typeof product.reviewCount === "number",
    );
    // Validate seller summary
    const seller = product.seller;
    typia.assert(seller);
    TestValidator.predicate(
      "seller has valid id",
      typeof seller.id === "string",
    );
    TestValidator.predicate(
      "seller has shop_name",
      typeof seller.shop_name === "string",
    );
    // Validate category summary
    const category = product.category;
    typia.assert(category);
    TestValidator.predicate(
      "category has valid id",
      typeof category.id === "string",
    );
    TestValidator.predicate(
      "category has name",
      typeof category.name === "string",
    );
  }
  // 5. Test with different pagination parameters
  const wishlistPage2: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 2,
          limit: 5,
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistPage2);
  TestValidator.equals(
    "page 2 current is 2",
    wishlistPage2.pagination.current,
    2,
  );
  TestValidator.equals("page 2 limit is 5", wishlistPage2.pagination.limit, 5);
  // 6. Test ascending order
  const wishlistAsc: IPageIEcommerceMallWishlist.ISummary =
    await api.functional.ecommerceMall.customer.wishlists.index(
      customerConnection,
      {
        body: {
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "asc",
        } satisfies IEcommerceMallWishlist.IRequest,
      },
    );
  typia.assert(wishlistAsc);
  TestValidator.equals("ascending order", wishlistAsc.pagination.current, 1);
}
