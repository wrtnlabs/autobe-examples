import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCartItem";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCartItem";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_cart_items_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new member account for authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create a shopping cart for the member using their authorized connection
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 3: Retrieve cart items for the member's own cart (successful retrieval)
  // Since ICommunityPlatformCart has categoryId but not id, and the endpoint requires cartId,
  // we use categoryId as the cartId parameter
  const itemsPage: IPageICommunityPlatformCartItem =
    await api.functional.communityPlatform.carts.items.index(memberConnection, {
      cartId: cart.categoryId,
      body: {
        page: 1,
        limit: 10,
        sort_by: "created_at",
        order: "desc",
        min_quantity: 1,
        max_quantity: 100,
        min_price: 0,
        max_price: 10000,
        created_after: new Date().toISOString(),
        created_before: new Date(Date.now() + 86400000).toISOString(),
      } satisfies ICommunityPlatformCartItem.IRequest,
    });
  typia.assert(itemsPage);
  TestValidator.equals("pagination page", itemsPage.pagination.current, 1);
  TestValidator.equals("pagination limit", itemsPage.pagination.limit, 10);
  TestValidator.predicate("items retrieved", itemsPage.data.length > 0);
  // Step 4: Create a second member account (different user)
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(otherMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(otherMember);
  // Step 5: Attempt to access the first member's cart items using the second member's connection (ownership validation)
  // This must fail with an error due to ownership enforcement
  await TestValidator.error(
    "other member cannot access another member's cart items",
    async () => {
      await api.functional.communityPlatform.carts.items.index(
        otherMemberConnection,
        {
          cartId: cart.categoryId,
          body: {
            page: 1,
            limit: 10,
          } satisfies ICommunityPlatformCartItem.IRequest,
        },
      );
    },
  );
}
