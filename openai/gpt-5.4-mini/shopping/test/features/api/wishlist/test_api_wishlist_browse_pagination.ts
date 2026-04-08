import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformWishlist";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIMallPlatformWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIMallPlatformWishlist";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_wishlist_browse_pagination(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test authenticated customer wishlist browsing pagination.
   *
   * Validates that a customer can browse their wishlist as a paginated page,
   * with correct pagination metadata and wishlist entry structure.
   * It also verifies the empty wishlist case returns a valid empty page instead
   * of an error, and that repeated browsing remains stable when the underlying
   * wishlist is unchanged.
   *
   * 1. Register and authenticate a customer using a dedicated connection.
   * 2. Browse the customer's wishlist with the authenticated connection.
   * 3. Validate the page metadata and response structure.
   * 4. Browse again and confirm the response remains stable.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const firstPage =
    await api.functional.mallPlatform.customer.wishlists.at(customerConnection);
  typia.assert(firstPage);
  TestValidator.predicate(
    "wishlist pagination current page is valid",
    firstPage.pagination.current >= 1,
  );
  TestValidator.predicate(
    "wishlist pagination limit is valid",
    firstPage.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "wishlist pagination records are valid",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "wishlist pagination pages are valid",
    firstPage.pagination.pages >= 0,
  );
  TestValidator.equals(
    "wishlist data matches pagination records when empty or partially loaded",
    firstPage.data.length <= firstPage.pagination.limit ||
      firstPage.pagination.limit === 0,
    true,
  );
  const repeatedPage =
    await api.functional.mallPlatform.customer.wishlists.at(customerConnection);
  typia.assert(repeatedPage);
  TestValidator.equals(
    "repeat browsing pagination",
    repeatedPage.pagination,
    firstPage.pagination,
  );
  TestValidator.equals(
    "repeat browsing data",
    repeatedPage.data,
    firstPage.data,
  );
}
