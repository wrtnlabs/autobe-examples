import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test business rule validation when member attempts to delete a non-existent wishlist item.
 *
 * Validates that the system properly rejects deletion requests for wishlist items that do not exist or do not belong to the authenticated customer. This tests the access control and data ownership business rule that customers can only delete their own wishlist items.
 *
 * 1. Create a new member account via join operation with randomized credentials.
 * 2. Attempt to delete a wishlist item using a randomly generated UUID that does not exist in the system.
 * 3. Validate that the API returns 404 Not Found error, confirming proper access control enforcement.
 */
export async function test_api_wishlist_item_nonexistent_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account using utility function
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallMember.IJoin,
  });
  // 2. Attempt to delete non-existent wishlist item
  await TestValidator.httpError(
    "should return 404 for non-existent wishlist item",
    404,
    async () => {
      await api.functional.shoppingMall.member.wishlist_items.erase(
        memberConnection,
        {
          wishlistItemId: typia.random<string & tags.Format<"uuid">>(),
        },
      );
    },
  );
}
