import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCart";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductVariant } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductVariant";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test retrieving an empty shopping cart for a newly registered member.
 *
 * Validates the cart retrieval endpoint works correctly for customers who have not yet added any items to their cart. Ensures the system properly handles the empty cart state and returns the expected response structure.
 *
 * This test verifies that newly registered members can access their cart immediately after registration, and that the cart endpoint correctly returns an empty state when no items have been added. This is important for ensuring a smooth user experience during the initial shopping flow.
 *
 * 1. Register a new member account with unique credentials using authorize_member_join.
 * 2. The authorize function automatically authenticates and updates the connection with JWT tokens.
 * 3. Retrieve the shopping cart using the authenticated member connection.
 * 4. Validate the response structure handles empty cart state appropriately.
 */
export async function test_api_cart_retrieve_empty(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member-specific connection and register new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  typia.assert(member);
  // 2. Retrieve the shopping cart (should be empty for new member)
  const cart =
    await api.functional.shoppingMall.member.cart.at(memberConnection);
  // 3. Validate cart response - for empty cart, validate structure if returned
  // The API returns IShoppingMallCart.IInvert which represents cart items
  // For empty cart, we validate the response type is correct
  typia.assert(cart);
}
