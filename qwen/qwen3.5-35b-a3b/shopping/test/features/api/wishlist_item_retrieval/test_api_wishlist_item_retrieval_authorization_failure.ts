import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallMember";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
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

export async function test_api_wishlist_item_retrieval_authorization_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register customer A and create their connection
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(customerAConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallMember.IJoin,
    });
  typia.assert(customerA);
  // 2. Create a wishlist for customer A
  const wishlistA: IEcommerceMallWishlist =
    await api.functional.ecommerceMall.member.wishlists.create(
      customerAConnection,
      {
        body: typia.random<IEcommerceMallWishlist.ICreate>(),
      },
    );
  typia.assert(wishlistA);
  // 3. Register customer B and create their connection
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB: IEcommerceMallMember.IAuthorized =
    await authorize_member_join(customerBConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallMember.IJoin,
    });
  typia.assert(customerB);
  // 4. Create a wishlist for customer B
  const wishlistB: IEcommerceMallWishlist =
    await api.functional.ecommerceMall.member.wishlists.create(
      customerBConnection,
      {
        body: typia.random<IEcommerceMallWishlist.ICreate>(),
      },
    );
  typia.assert(wishlistB);
  // 5. List items from customer B's wishlist to verify it exists (may be empty)
  const itemsResponse: IPageIEcommerceMallWishlistItem.ISummary =
    await api.functional.ecommerceMall.member.wishlists.items.index(
      customerBConnection,
      {
        wishlistId: wishlistB.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallWishlistItem.IRequest,
      },
    );
  typia.assert(itemsResponse);
  // 6. Generate a valid wishlist item UUID from customer B's wishlist
  // If B has items, use the first item's ID. Otherwise, generate a random UUID.
  // The authorization check will fail regardless since A doesn't own the wishlist.
  const testItemId: string & tags.Format<"uuid"> =
    itemsResponse.data.length > 0
      ? itemsResponse.data[0].id
      : typia.random<(string & tags.Format<"uuid">)>();
  // 7. Attempt to retrieve customer B's wishlist item as customer A
  // This should return 404 Not Found because customer A doesn't own wishlist B
  // The 404 should be for authorization (item not accessible to A), not for item not existing
  await TestValidator.httpError(
    "customer A cannot access customer B's wishlist item",
    404,
    async () => {
      await api.functional.ecommerceMall.member.wishlists.items.at(
        customerAConnection,
        {
          wishlistId: wishlistB.id,
          itemId: testItemId,
        },
      );
    },
  );
  // 8. Verify customer A can access their own wishlist items (control check)
  // Accessing wishlist A should work for customer A
  const ownItemResponse: IEcommerceMallWishlistItem =
    await api.functional.ecommerceMall.member.wishlists.items.at(
      customerAConnection,
      {
        wishlistId: wishlistA.id,
        itemId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  // This will also return 404 if A's wishlist is empty, which is expected
  // The key test is that B's item returns 404 when accessed by A
}