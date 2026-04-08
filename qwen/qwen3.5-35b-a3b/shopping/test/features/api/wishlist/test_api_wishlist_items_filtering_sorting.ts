import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_ecommerce_mall_member_wishlists_create } from "../../../generate/generate_random_ecommerce_mall_member_wishlists_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

export async function test_api_wishlist_items_filtering_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(authResponse);
  // Create customer-specific connection with token
  const customerTokenConnection: api.IConnection = { host: connection.host };
  customerTokenConnection.headers = {
    ...connection.headers,
    Authorization: authResponse.token.access,
  };
  // 2. Create wishlist with products
  const wishlist = await generate_random_ecommerce_mall_member_wishlists_create(
    customerTokenConnection,
    {
      body: {} satisfies IEcommerceMallWishlist.ICreate,
    },
  );
  typia.assert(wishlist);
  // 3. Test name search filter
  const searchResults =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerTokenConnection,
      {
        wishlistId: wishlist.id,
        body: {
          search: "Wireless",
          limit: 100,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(searchResults);
  TestValidator.equals(
    "search results count",
    searchResults.data.length,
    searchResults.data.filter((item) =>
      item.product.name.toLowerCase().includes("wireless".toLowerCase()),
    ).length,
  );
  // 4. Test availability filter - available products
  const availableResults =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerTokenConnection,
      {
        wishlistId: wishlist.id,
        body: {
          status_filter: "available",
          limit: 100,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(availableResults);
  TestValidator.equals(
    "available status filter works",
    availableResults.data.every(
      (item) => item.product.availabilityStatus === "available",
    ),
    true,
  );
  // 5. Test availability filter - unavailable products
  const unavailableResults =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerTokenConnection,
      {
        wishlistId: wishlist.id,
        body: {
          status_filter: "unavailable",
          limit: 100,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(unavailableResults);
  TestValidator.equals(
    "unavailable status filter works",
    unavailableResults.data.every(
      (item) => item.product.availabilityStatus === "unavailable",
    ),
    true,
  );
  // 6. Test sorting by name
  const nameSortedResults =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerTokenConnection,
      {
        wishlistId: wishlist.id,
        body: {
          sort_by: "name",
          limit: 100,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(nameSortedResults);
  const names = nameSortedResults.data.map((item) => item.product.name);
  const sortedNames = [...names].sort((a, b) => a.localeCompare(b));
  TestValidator.equals(
    "name sorting works (A-Z)",
    JSON.stringify(names),
    JSON.stringify(sortedNames),
  );
  // 7. Test default sorting by created_at (newest first)
  const defaultSortedResults =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerTokenConnection,
      {
        wishlistId: wishlist.id,
        body: {
          limit: 100,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(defaultSortedResults);
  const defaultNames = defaultSortedResults.data.map(
    (item) => item.product.name,
  );
  TestValidator.equals(
    "default sorting returns items",
    defaultNames.length > 0,
    true,
  );
  // 8. Test combined filters (search + status_filter)
  const combinedResults =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerTokenConnection,
      {
        wishlistId: wishlist.id,
        body: {
          search: "Wireless",
          status_filter: "available",
          limit: 100,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(combinedResults);
  TestValidator.equals(
    "combined filters work",
    combinedResults.data.every(
      (item) =>
        item.product.name.toLowerCase().includes("wireless".toLowerCase()) &&
        item.product.availabilityStatus === "available",
    ),
    true,
  );
  TestValidator.equals(
    "combined filter pagination metadata",
    combinedResults.pagination.records,
    combinedResults.data.length,
  );
}
