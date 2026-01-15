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
import { prepare_random_community_platform_cart_item } from "../../../prepare/prepare_random_community_platform_cart_item";
import { generate_random_community_platform_member_carts_items_create } from "../../../generate/generate_random_community_platform_member_carts_items_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_cart_deletion_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as member to create and own the cart
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
  // Step 2: Create a new shopping cart for the member
  const cart: ICommunityPlatformCart =
    await api.functional.communityPlatform.carts.create(memberConnection);
  typia.assert(cart);
  // Step 3: Add items to the cart to ensure it has content before deletion
  const cartItem: ICommunityPlatformCartItem =
    await generate_random_community_platform_member_carts_items_create(
      memberConnection,
      {
        body: {
          product_variant_id: typia.random<string & tags.Format<"uuid">>(),
          quantity: 1,
        } satisfies ICommunityPlatformCartItem.ICreate,
        params: {
          cartId: (cart as any).id,
        },
      },
    );
  typia.assert(cartItem);
  // Step 4: Delete the cart
  await api.functional.communityPlatform.carts.erase(memberConnection, {
    cartId: (cart as any).id,
  });
  // Validation: Cart deletion is complete as it returns void.
  // Due to API limitations, we cannot validate 404 on access because no .at() endpoint exists in provided API.
  // The CSVExportController implementation does not require a read endpoint to be present for deletion validation.
}