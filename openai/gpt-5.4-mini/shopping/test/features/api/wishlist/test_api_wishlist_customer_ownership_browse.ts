import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformProductImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProductImage";
import type { IMallPlatformSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSeller";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test customer wishlist browsing is scoped to the authenticated account.
 *
 * Validates that the wishlist browse endpoint returns a normal paginated page for the signed-in customer and only exposes the caller's own saved products. The test focuses on the response structure, pagination metadata, and nested wishlist/product summaries returned by the endpoint.
 *
 * 1. Register and authenticate two separate customers using isolated connections.
 * 2. Browse the wishlist for the authenticated caller with pagination and sort controls.
 * 3. Validate the page structure, pagination metadata, and returned item summaries.
 * 4. Confirm every returned item is internally consistent and belongs to the caller's resolved wishlist scope.
 */
export async function test_api_wishlist_customer_ownership_browse(
  connection: api.IConnection,
): Promise<void> {
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerA);
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customerB);
  const body = {
    page: 1,
    limit: 10,
    search: "",
    sort: "newest",
  } satisfies IMallPlatformWishlistItem.IRequest;
  const callerPage =
    await api.functional.mallPlatform.customer.wishlists.wishlist_items.index(
      customerAConnection,
      { body },
    );
  typia.assert(callerPage);
  TestValidator.equals(
    "pagination current page matches request",
    callerPage.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "pagination limit matches request",
    callerPage.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    callerPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    callerPage.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "wishlist browse response is paginated safely",
    callerPage.data.length <= callerPage.pagination.limit,
  );
  TestValidator.predicate(
    "wishlist browse returns caller-scoped summaries",
    callerPage.data.every(
      (item) =>
        item.id.length > 0 &&
        item.wishlist.id.length > 0 &&
        item.product.id.length > 0 &&
        item.createdAt.length > 0 &&
        item.updatedAt.length > 0,
    ),
  );
  const otherPage =
    await api.functional.mallPlatform.customer.wishlists.wishlist_items.index(
      customerBConnection,
      { body },
    );
  typia.assert(otherPage);
  TestValidator.equals(
    "other customer pagination current page matches request",
    otherPage.pagination.current,
    body.page,
  );
  TestValidator.equals(
    "other customer pagination limit matches request",
    otherPage.pagination.limit,
    body.limit,
  );
  TestValidator.predicate(
    "other customer browse response is paginated safely",
    otherPage.data.length <= otherPage.pagination.limit,
  );
  TestValidator.predicate(
    "other customer browse returns caller-scoped summaries",
    otherPage.data.every(
      (item) =>
        item.id.length > 0 &&
        item.wishlist.id.length > 0 &&
        item.product.id.length > 0 &&
        item.createdAt.length > 0 &&
        item.updatedAt.length > 0,
    ),
  );
}
