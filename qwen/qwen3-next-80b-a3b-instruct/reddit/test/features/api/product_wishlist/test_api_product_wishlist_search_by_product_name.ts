import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformProductWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProductWishlist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProductWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProductWishlist";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_product_wishlist_search_by_product_name(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member by joining
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create two wishlist items with product names containing the search term
  // Create first wishlist item
  const product1 =
    await api.functional.communityPlatform.productwishlists.index(
      memberConnection,
      {
        body: {
          search: "Smartphone Pro",
        } satisfies ICommunityPlatformProductWishlist.IRequest,
      },
    );
  typia.assert(product1);
  // Create second wishlist item
  const product2 =
    await api.functional.communityPlatform.productwishlists.index(
      memberConnection,
      {
        body: {
          search: "Premium Smartphone",
        } satisfies ICommunityPlatformProductWishlist.IRequest,
      },
    );
  typia.assert(product2);
  // Step 3: Execute search with partial product name
  const searchResults =
    await api.functional.communityPlatform.productwishlists.index(
      memberConnection,
      {
        body: {
          search: "phone",
        } satisfies ICommunityPlatformProductWishlist.IRequest,
      },
    );
  typia.assert(searchResults);
  // Step 4: Validate results contain only active items matching search term owned by authenticated member, sorted by creation_date descending
  TestValidator.equals("search result count", searchResults.data.length, 2);
  for (const item of searchResults.data) {
    TestValidator.predicate(
      "item belongs to authenticated member",
      item.member_id === member.id,
    );
    TestValidator.predicate("item status is active", item.status === "active");
    TestValidator.predicate(
      "product name contains search term",
      item.product_name.toLowerCase().includes("phone"),
    );
  }
  // Validate sorting by creation date descending (newest first)
  for (let i = 0; i < searchResults.data.length - 1; i++) {
    const currentItem = new Date(searchResults.data[i].created_at);
    const nextItem = new Date(searchResults.data[i + 1].created_at);
    TestValidator.predicate(
      "items sorted by creation date descending",
      currentItem >= nextItem,
    );
  }
}
