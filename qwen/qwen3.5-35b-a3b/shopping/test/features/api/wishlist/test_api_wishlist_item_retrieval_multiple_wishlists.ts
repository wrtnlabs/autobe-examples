import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import type { IEcommerceMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlistItem";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
 * Test retrieval of a wishlist item when the authenticated customer owns multiple wishlists,
 * ensuring the API correctly scopes items to the specific wishlist.
 *
 * This test validates that when a customer has multiple wishlists, the API correctly retrieves
 * items scoped to the specific wishlist identified in the path parameters, and does not mix up
 * items between different wishlists of the same customer.
 *
 * The test creates a member customer and two separate wishlists, then attempts to retrieve
 * items from each wishlist to verify proper scoping and access control.
 *
 * @param connection Base API connection
 */
export async function test_api_wishlist_item_retrieval_multiple_wishlists(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a member customer
  const customerConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      phone_number: RandomGenerator.mobile(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Create first wishlist using utility function
  const wishlist1 =
    await generate_random_ecommerce_mall_member_wishlists_create(
      customerConnection,
      { body: {} satisfies IEcommerceMallWishlist.ICreate },
    );
  typia.assert(wishlist1);
  const wishlistId1: string & tags.Format<"uuid"> = wishlist1.id;
  // 3. Create second wishlist
  const wishlist2 =
    await generate_random_ecommerce_mall_member_wishlists_create(
      customerConnection,
      { body: {} satisfies IEcommerceMallWishlist.ICreate },
    );
  typia.assert(wishlist2);
  const wishlistId2: string & tags.Format<"uuid"> = wishlist2.id;
  // Verify wishlists are distinct
  TestValidator.notEquals(
    "distinct wishlists created",
    wishlistId1,
    wishlistId2,
  );
  // 4. Attempt to retrieve non-existent items from each wishlist
  // This validates the API correctly scopes items to specific wishlist and returns 404
  const itemId1: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const itemId2: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Test wishlist 1 item retrieval (should return 404)
  await TestValidator.error(
    "wishlist 1 item not found returns 404",
    async () => {
      const item1 =
        await api.functional.ecommerceMall.member.wishlists.items.at(
          customerConnection,
          {
            wishlistId: wishlistId1,
            itemId: itemId1,
          },
        );
      typia.assert(item1);
    },
  );
  // Test wishlist 2 item retrieval (should return 404)
  await TestValidator.error(
    "wishlist 2 item not found returns 404",
    async () => {
      const item2 =
        await api.functional.ecommerceMall.member.wishlists.items.at(
          customerConnection,
          {
            wishlistId: wishlistId2,
            itemId: itemId2,
          },
        );
      typia.assert(item2);
    },
  );
}
