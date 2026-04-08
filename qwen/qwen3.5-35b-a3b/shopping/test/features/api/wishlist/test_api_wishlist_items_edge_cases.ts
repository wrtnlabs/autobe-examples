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

/**
 * Test wishlist items edge cases including empty wishlists, non-existent
 * wishlist scenarios, and access control validation.
 *
 * Validates edge cases for wishlist items listing including empty wishlists,
 * non-existent wishlist scenarios, and access control enforcement. Ensures
 * that the API properly handles empty collections, returns appropriate errors
 * for invalid access, and enforces proper authorization boundaries.
 *
 * Special attention is given to verifying that empty wishlists return proper
 * paginated responses (not null), that non-existent wishlist IDs return 404,
 * and that users cannot access another customer's wishlist (403 Forbidden).
 *
 * 1. Customer A joins and creates an empty wishlist (no products).
 * 2. Request items for empty wishlist, verify pagination shows 0 records.
 * 3. Customer B joins and creates a wishlist.
 * 4. Test listing with non-existent wishlist ID (404 Not Found).
 * 5. Test listing with another customer's wishlist ID (403 Forbidden).
 * 6. Verify empty wishlist returns proper empty paginated response.
 * 7. Verify access control prevents cross-customer wishlist access.
 */
export async function test_api_wishlist_items_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // === Step 1: Customer A - Join and create empty wishlist ===
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_member_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    },
  });
  typia.assert(customerAAuth);
  const customerAEmptyWishlist =
    await generate_random_ecommerce_mall_member_wishlists_create(
      customerAConnection,
      {
        body: {},
      },
    );
  typia.assert(customerAEmptyWishlist);
  TestValidator.equals(
    "empty wishlist has no items",
    customerAEmptyWishlist.items.length,
    0,
  );
  // === Step 2: Request items for empty wishlist ===
  const emptyWishlistItems =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerAConnection,
      {
        wishlistId: customerAEmptyWishlist.id,
        body: {},
      },
    );
  typia.assert(emptyWishlistItems);
  TestValidator.equals(
    "empty wishlist pagination current",
    1,
    emptyWishlistItems.pagination.current,
  );
  TestValidator.equals(
    "empty wishlist pagination limit",
    20,
    emptyWishlistItems.pagination.limit,
  );
  TestValidator.equals(
    "empty wishlist pagination records",
    0,
    emptyWishlistItems.pagination.records,
  );
  TestValidator.equals(
    "empty wishlist pagination pages",
    0,
    emptyWishlistItems.pagination.pages,
  );
  TestValidator.equals(
    "empty wishlist data array is empty",
    emptyWishlistItems.data.length,
    0,
  );
  // === Step 3: Customer B - Join and create wishlist ===
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuthorization = await authorize_member_join(
    customerBConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      },
    },
  );
  typia.assert(customerBAuthorization);
  const customerBWishlist =
    await generate_random_ecommerce_mall_member_wishlists_create(
      customerBConnection,
      {
        body: {},
      },
    );
  typia.assert(customerBWishlist);
  // === Step 4: Test non-existent wishlist ID (404) ===
  const fakeUUID = "00000000-0000-0000-0000-000000000000";
  try {
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerBConnection,
      {
        wishlistId: fakeUUID,
        body: {},
      },
    );
    throw new Error("Should have thrown 404");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals(
        "non-existent wishlist returns 404",
        error.status,
        404,
      );
    } else {
      throw error;
    }
  }
  // === Step 5: Test accessing another customer's wishlist (403) ===
  try {
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerBConnection,
      {
        wishlistId: customerAEmptyWishlist.id,
        body: {},
      },
    );
    throw new Error("Should have thrown 403");
  } catch (error) {
    if (typia.is<api.HttpError>(error)) {
      TestValidator.equals(
        "another customer's wishlist returns 403",
        error.status,
        403,
      );
    } else {
      throw error;
    }
  }
  // === Step 6: Verify empty wishlist response consistency ===
  const emptyWishlistItemsPage2 =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerAConnection,
      {
        wishlistId: customerAEmptyWishlist.id,
        body: {
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(emptyWishlistItemsPage2);
  TestValidator.equals(
    "empty wishlist page 2 records",
    0,
    emptyWishlistItemsPage2.pagination.records,
  );
  TestValidator.equals(
    "empty wishlist page 2 pages",
    0,
    emptyWishlistItemsPage2.pagination.pages,
  );
}
