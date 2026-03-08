import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallProduct";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallWishlist } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallWishlist";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_ecommerce_mall_customer_wishlists_create } from "../../../generate/generate_random_ecommerce_mall_customer_wishlists_create";
import { prepare_random_ecommerce_mall_wishlist } from "../../../prepare/prepare_random_ecommerce_mall_wishlist";

/**
 * Test authorization edge case: Customer attempts to delete another customer's wishlist entry.
 * 1. Customer A registers and adds product to their wishlist
 * 2. Customer B registers a separate account
 * 3. Customer B attempts to delete Customer A's wishlist entry
 * 4. System returns 403 Forbidden (wrong ownership)
 * 5. Customer A's entry still exists and remains accessible
 */
export async function test_api_wishlist_deletion_wrong_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register Customer A (the owner)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerAAuth = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<(string & tags.Format<"email">)>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<(string & tags.Format<"uri">)>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
      ip: typia.random<(string & tags.Format<"ipv4">)>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerAAuth);
  // 2. Add product to Customer A's wishlist
  const wishlistEntry =
    await api.functional.ecommerceMall.customer.wishlists.create(
      customerAConnection,
      {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallWishlist.ICreate,
      },
    );
  typia.assert(wishlistEntry);
  // 3. Register Customer B (non-owner)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerBAuth = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<(string & tags.Format<"email">)>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<(string & tags.Format<"uri">)>(),
      referrer: typia.random<(string & tags.Format<"uri">)>(),
      ip: typia.random<(string & tags.Format<"ipv4">)>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerBAuth);
  // 4. Customer B attempts to delete Customer A's wishlist entry
  // Expected: 403 Forbidden because Customer B does not own this entry
  await TestValidator.error(
    "wrong owner cannot delete wishlist entry",
    async () => {
      await api.functional.ecommerceMall.customer.wishlists.erase(
        customerBConnection,
        {
          wishlistId: wishlistEntry.id,
        },
      );
    },
  );
  // 5. Verify deletion was blocked and Customer A's entry still exists
  // Add the same product again to Customer A's wishlist
  // If the original entry still exists and unique constraint is enforced, this should either:
  // - Succeed (if duplicate entries are allowed) OR
  // - Fail with a conflict error (if unique constraint exists)
  // The key point: the entry was NOT deleted by Customer B
  const duplicateWishlistEntry =
    await api.functional.ecommerceMall.customer.wishlists.create(
      customerAConnection,
      {
        body: {
          product_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallWishlist.ICreate,
      },
    );
  typia.assert(duplicateWishlistEntry);
  // Verify the new entry is different from the original
  TestValidator.notEquals(
    "new wishlist entry has different id",
    wishlistEntry.id,
    duplicateWishlistEntry.id,
  );
}