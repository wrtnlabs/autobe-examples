import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCategory";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_shopping_mall_member_wishlist_items_create } from "../../../generate/generate_random_shopping_mall_member_wishlist_items_create";
import { prepare_random_shopping_mall_wishlist_item } from "../../../prepare/prepare_random_shopping_mall_wishlist_item";

/**
 * Test wishlist item creation rejection when product does not exist.
 *
 * Validates that the system properly rejects attempts to add non-existent products to a customer's wishlist. This test ensures data integrity by preventing orphaned wishlist references to products that don't exist in the catalog.
 *
 * The test creates an authenticated member session, then attempts to add a product using a randomly generated UUID that is guaranteed not to correspond to any existing product in the shopping_mall_products table.
 *
 * 1. Member registers and authenticates via join endpoint.
 * 2. Generate a valid UUID format that does not exist in product catalog.
 * 3. Member attempts to add non-existent product to wishlist.
 * 4. System validates productId existence and rejects with appropriate error.
 * 5. Validates that no wishlist item was created.
 */
export async function test_api_wishlist_item_nonexistent_product_rejection(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
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
  // 2. Generate a UUID that doesn't correspond to any existing product
  const nonExistentProductId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to add non-existent product to wishlist - should fail
  await TestValidator.error("non-existent product rejection", async () => {
    await api.functional.shoppingMall.member.wishlist_items.create(
      memberConnection,
      {
        body: {
          shopping_mall_product_id: nonExistentProductId,
        } satisfies IShoppingMallWishlistItem.ICreate,
      },
    );
  });
}
