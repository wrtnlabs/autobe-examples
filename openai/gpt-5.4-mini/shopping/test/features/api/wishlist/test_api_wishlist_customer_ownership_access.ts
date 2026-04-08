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

/**
 * Verifies that the customer wishlist listing is restricted to the authenticated owner.
 *
 * This test checks the ownership boundary for the wishlist endpoint by creating
 * a real customer session, reading that customer's wishlist page, and confirming
 * that every returned wishlist record belongs to the signed-in account.
 *
 * It also verifies the platform's access-control rule for anonymous callers by
 * ensuring that unauthenticated access is rejected. The DTO available for this
 * endpoint exposes wishlist records and their owner relation, so the validation
 * focuses on response shape, pagination metadata, and caller ownership rather
 * than product-level wishlist contents.
 *
 * 1. Register a customer account and capture the authenticated customer session.
 * 2. Read the wishlist listing with the authenticated customer connection.
 * 3. Validate page metadata and ensure every returned record belongs to that customer.
 * 4. Confirm that an unauthenticated request is rejected.
 */
export async function test_api_wishlist_customer_ownership_access(
  connection: api.IConnection,
): Promise<void> {
  const customerConnection: api.IConnection = { host: connection.host };
  const joined = await authorize_customer_join(customerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://example.com/register",
      referrer: "https://example.com",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const wishlist =
    await api.functional.mallPlatform.customer.wishlists.at(customerConnection);
  typia.assert(wishlist);
  TestValidator.predicate(
    "wishlist page records should be non-negative",
    wishlist.pagination.records >= 0,
  );
  TestValidator.predicate(
    "wishlist page limit should be non-negative",
    wishlist.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "wishlist page current should be non-negative",
    wishlist.pagination.current >= 0,
  );
  TestValidator.predicate(
    "wishlist page pages should be non-negative",
    wishlist.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "wishlist entries should belong to the authenticated customer",
    () => wishlist.data.every((entry) => entry.customer.id === joined.id),
  );
  const anonymousConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "wishlist should reject unauthenticated access",
    [401, 403],
    async () => {
      await api.functional.mallPlatform.customer.wishlists.at(
        anonymousConnection,
      );
    },
  );
}
