import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCartItem";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_cart_item_removal_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth: ICommunityPlatformAdmin.IAuthorized =
    await authorize_admin_join(adminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        href: "https://example.com/join",
        referrer: "https://example.com",
        ip: null,
      } satisfies ICommunityPlatformAdmin.IJoin,
    });
  // adminConnection.headers now contains authorization token
  // Step 2: Generate a cartId and itemId (assumes these represent an existing cart item in the system)
  // Since there is no API to create cart items, we generate UUIDs as placeholders for existing cart items
  const cartId: string = typia.random<string & tags.Format<"uuid">>();
  const itemId: string = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Use admin connection to delete the cart item
  const deletedItem: ICommunityPlatformCartItem =
    await api.functional.communityPlatform.admin.carts.items.erase(
      adminConnection,
      { cartId, itemId },
    );
  typia.assert(deletedItem);
  // Step 4: Verify the deleted item properties (ONLY business logic, not format validation)
  // Format validation is handled by typia.assert()
  TestValidator.equals("deleted item ID matches", deletedItem.id, itemId);
  TestValidator.predicate("quantity is positive", deletedItem.quantity >= 1);
  TestValidator.predicate("price is non-negative", deletedItem.price >= 0);
}
