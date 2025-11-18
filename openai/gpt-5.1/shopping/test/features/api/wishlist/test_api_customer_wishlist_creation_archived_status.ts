import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallWishlist";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlist";

export async function test_api_customer_wishlist_creation_archived_status(
  connection: api.IConnection,
) {
  // 1. Register (join) a new customer to establish authenticated context
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    // leave ip undefined to let server derive it
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const authorizedCustomer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: joinBody,
    });
  typia.assert(authorizedCustomer);

  // 2. Create wishlist with archived status and non-default flag
  const archivedStatus = "archived";

  const createBody = {
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.paragraph({ sentences: 4 }),
    is_default: false,
    status: archivedStatus,
  } satisfies IShoppingMallWishlist.ICreate;

  const createdWishlist: IShoppingMallWishlist =
    await api.functional.shoppingMall.customer.wishlists.create(connection, {
      body: createBody,
    });
  typia.assert(createdWishlist);

  // Verify created wishlist business fields
  TestValidator.equals(
    "created wishlist has archived status",
    createdWishlist.status,
    archivedStatus,
  );
  TestValidator.equals(
    "created wishlist is not default",
    createdWishlist.is_default,
    false,
  );
  TestValidator.equals(
    "created wishlist belongs to joined customer",
    createdWishlist.customer.id,
    authorizedCustomer.id,
  );

  // 3. List wishlists filtered by archived status and verify inclusion
  const archivedIndexBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: undefined,
    status: archivedStatus,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IShoppingMallWishlist.IRequest;

  const archivedPage: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: archivedIndexBody,
    });
  typia.assert(archivedPage);

  const archivedIds = archivedPage.data.map((summary) => summary.id);
  TestValidator.predicate(
    "archived listing contains created wishlist",
    archivedIds.includes(createdWishlist.id),
  );

  // 4. List wishlists filtered by active status and verify exclusion
  const activeStatus = "active";
  const activeIndexBody = {
    page: 0 as number & tags.Type<"int32">,
    limit: 10 as number & tags.Type<"int32">,
    search: undefined,
    status: activeStatus,
    createdFrom: undefined,
    createdTo: undefined,
    orderBy: "created_at",
    orderDirection: "desc",
  } satisfies IShoppingMallWishlist.IRequest;

  const activePage: IPageIShoppingMallWishlist.ISummary =
    await api.functional.shoppingMall.customer.wishlists.index(connection, {
      body: activeIndexBody,
    });
  typia.assert(activePage);

  const activeIds = activePage.data.map((summary) => summary.id);
  TestValidator.predicate(
    "active listing does not contain archived wishlist",
    activeIds.includes(createdWishlist.id) === false,
  );
}
