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
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlistItem";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Verify that a newly authenticated customer sees an empty wishlist browse result.
 *
 * This test covers the customer wishlist browsing flow for a fresh account that
 * has not saved any products yet. It validates the default pagination behavior
 * and ensures the API returns an empty data array with zero record and page
 * counts for the first browse request.
 *
 * 1. Register a new customer account and authenticate a dedicated connection.
 * 2. Browse the customer wishlist with default request controls.
 * 3. Validate that the response contains no wishlist items and empty-state pagination.
 */
export async function test_api_wishlist_items_browse_empty_list(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const email: string = `${RandomGenerator.alphabets(10)}@test.com`;
  await authorize_customer_join(customerConnection, {
    body: {
      email,
      password: "1234",
      href: "http://localhost",
      referrer: "http://localhost",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const output: IPageIMallPlatformWishlistItem.ISummary =
    await api.functional.mallPlatform.customer.wishlists.items.index(
      customerConnection,
      {
        body: {} satisfies IMallPlatformWishlistItem.IRequest,
      },
    );
  typia.assert(output);
  TestValidator.equals("wishlist items should be empty", output.data.length, 0);
  TestValidator.equals(
    "wishlist total records should be zero",
    output.pagination.records,
    0,
  );
  TestValidator.equals(
    "wishlist total pages should be zero",
    output.pagination.pages,
    0,
  );
}
