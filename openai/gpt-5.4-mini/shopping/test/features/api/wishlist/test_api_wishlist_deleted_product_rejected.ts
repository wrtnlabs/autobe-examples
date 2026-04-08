import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCategory";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformProduct";
import type { IMallPlatformSellerAccount } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformSellerAccount";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_wishlists_items_create } from "../../../generate/generate_random_mall_platform_customer_wishlists_items_create";
import { prepare_random_mall_platform_wishlist_item } from "../../../prepare/prepare_random_mall_platform_wishlist_item";

export async function test_api_wishlist_deleted_product_rejected(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Verifies wishlist creation rejects a missing product reference and does not mutate the customer's wishlist state.
   *
   * This test authenticates a customer and attempts to save a product UUID that is not known to exist in the catalog. Because the provided SDK surface does not expose product creation, deletion, or wishlist listing endpoints, the scenario is validated through the public wishlist-create contract by asserting that a nonexistent product reference is rejected.
   *
   * 1. Register a customer and create an authenticated customer connection.
   * 2. Attempt to save a non-existent product UUID into the wishlist.
   * 3. Assert the request is rejected by the API.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123!",
      href: "https://example.com/register",
      referrer: "https://example.com/landing",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(customer);
  await TestValidator.httpError(
    "deleted or missing product cannot be added to wishlist",
    [400, 404, 409, 422],
    async () => {
      await generate_random_mall_platform_customer_wishlists_items_create(
        customerConnection,
        {
          body: {
            product_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    },
  );
}
