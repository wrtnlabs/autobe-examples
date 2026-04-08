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

export async function test_api_wishlist_items_pagination_flow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(auth);
  // 2. Create wishlist (empty - no initial products possible with current DTO)
  const wishlist = await api.functional.ecommerceMall.member.wishlists.create(
    customerConnection,
    {
      body: {},
    },
  );
  typia.assert(wishlist);
  // 3. Test empty wishlist pagination
  const emptyPage =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerConnection,
      {
        wishlistId: wishlist.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(emptyPage);
  // Verify empty wishlist returns correct pagination metadata
  TestValidator.equals("empty page current", emptyPage.pagination.current, 1);
  TestValidator.equals("empty page limit", emptyPage.pagination.limit, 20);
  TestValidator.equals("empty page records", emptyPage.pagination.records, 0);
  TestValidator.equals("empty page pages", emptyPage.pagination.pages, 0);
  TestValidator.equals("empty page items count", emptyPage.data.length, 0);
  // Test that requested page exceeds total pages
  const overflowPage =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerConnection,
      {
        wishlistId: wishlist.id,
        body: {
          page: 5, // Request page 5 when records=0
          limit: 10,
        },
      },
    );
  typia.assert(overflowPage);
  TestValidator.equals(
    "overflow page current",
    overflowPage.pagination.current,
    5,
  );
  TestValidator.equals(
    "overflow page records",
    overflowPage.pagination.records,
    0,
  );
  TestValidator.equals("overflow page pages", overflowPage.pagination.pages, 0);
  TestValidator.equals(
    "overflow page items count",
    overflowPage.data.length,
    0,
  );
  // Test different limit values
  const smallLimitPage =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerConnection,
      {
        wishlistId: wishlist.id,
        body: {
          page: 1,
          limit: 5,
        },
      },
    );
  typia.assert(smallLimitPage);
  TestValidator.equals(
    "small limit page limit",
    smallLimitPage.pagination.limit,
    5,
  );
  TestValidator.equals(
    "small limit page records",
    smallLimitPage.pagination.records,
    0,
  );
  // Test with search filter on empty wishlist
  const searchPage =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerConnection,
      {
        wishlistId: wishlist.id,
        body: {
          page: 1,
          limit: 20,
          search: "test",
        },
      },
    );
  typia.assert(searchPage);
  TestValidator.equals("search page records", searchPage.pagination.records, 0);
  TestValidator.equals("search page items count", searchPage.data.length, 0);
  // Test with status filter on empty wishlist
  const statusPage =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerConnection,
      {
        wishlistId: wishlist.id,
        body: {
          page: 1,
          limit: 20,
          status_filter: "available",
        },
      },
    );
  typia.assert(statusPage);
  TestValidator.equals(
    "status filter page records",
    statusPage.pagination.records,
    0,
  );
  TestValidator.equals(
    "status filter page items count",
    statusPage.data.length,
    0,
  );
  // Test sorting on empty wishlist
  const sortPage =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerConnection,
      {
        wishlistId: wishlist.id,
        body: {
          page: 1,
          limit: 20,
          sort_by: "name",
        },
      },
    );
  typia.assert(sortPage);
  TestValidator.equals("sort page records", sortPage.pagination.records, 0);
  TestValidator.equals("sort page items count", sortPage.data.length, 0);
}
