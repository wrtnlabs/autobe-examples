import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCart } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCart";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_cart_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member connection and authenticate
  const member1Connection: api.IConnection = { host: connection.host };
  const member1: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member1Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member1);
  // Step 2: Create first member's cart
  const cart1: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(member1Connection);
  typia.assert(cart1);
  // Step 3: Retrieve first member's cart (should succeed)
  const retrievedCart1: ICommunityPlatformCart =
    await api.functional.communityPlatform.member.carts.at(member1Connection, {
      cartId: cart1.categoryId,
    });
  typia.assert(retrievedCart1);
  TestValidator.equals(
    "cart category ID matches",
    retrievedCart1.categoryId,
    cart1.categoryId,
  );
  TestValidator.equals(
    "cart category name matches",
    retrievedCart1.categoryName,
    cart1.categoryName,
  );
  TestValidator.equals(
    "cart item count matches",
    retrievedCart1.cartItemCount,
    cart1.cartItemCount,
  );
  TestValidator.equals(
    "cart item value matches",
    retrievedCart1.cartItemValue,
    cart1.cartItemValue,
  );
  // Step 4: Create second member connection and authenticate
  const member2Connection: api.IConnection = { host: connection.host };
  const member2: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(member2Connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member2);
  // Step 5: Attempt to retrieve first member's cart as second member (should fail)
  await TestValidator.error(
    "second member cannot access other member's cart",
    async () => {
      await api.functional.communityPlatform.member.carts.at(
        member2Connection,
        {
          cartId: cart1.categoryId,
        },
      );
    },
  );
}
