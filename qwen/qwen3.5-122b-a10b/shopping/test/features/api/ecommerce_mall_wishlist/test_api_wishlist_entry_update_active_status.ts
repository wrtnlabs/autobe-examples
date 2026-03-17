import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCategory";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
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
 * Test that a customer can successfully update their own wishlist entry's active status.
 *
 * This test verifies:
 * 1. Customer authentication and wishlist entry creation
 * 2. Setting active=false populates deleted_at timestamp
 * 3. Setting active=true clears deleted_at timestamp
 * 4. updated_at field is automatically updated on each modification
 * 5. All response fields are present and correctly typed
 */
export async function test_api_wishlist_entry_update_active_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate customer
  const customerConnection: api.IConnection = { host: connection.host };
  const customer = await authorize_customer_join(customerConnection, {
    body: {
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(customer);
  // 2. Create a wishlist entry by adding a product
  const wishlistEntry =
    await generate_random_ecommerce_mall_customer_wishlists_create(
      customerConnection,
      {},
    );
  typia.assert(wishlistEntry);
  // Validate initial state: active=true, deleted_at=null
  TestValidator.equals("initial active status", wishlistEntry.active, true);
  TestValidator.equals("initial deleted_at", wishlistEntry.deleted_at, null);
  // Store original updated_at for comparison
  const originalUpdatedAt = wishlistEntry.updated_at;
  // 3. Update wishlist entry to set active=false
  const deactivatedEntry =
    await api.functional.ecommerceMall.customer.wishlists.update(
      customerConnection,
      {
        wishlistId: wishlistEntry.id,
        body: { active: false },
      },
    );
  typia.assert(deactivatedEntry);
  // Validate deactivated state
  TestValidator.equals(
    "deactivated active status",
    deactivatedEntry.active,
    false,
  );
  TestValidator.predicate(
    "deactivated deleted_at is populated",
    deactivatedEntry.deleted_at !== null,
  );
  TestValidator.notEquals(
    "updated_at changed after deactivation",
    deactivatedEntry.updated_at,
    originalUpdatedAt,
  );
  // 4. Update wishlist entry to set active=true
  const reactivatedEntry =
    await api.functional.ecommerceMall.customer.wishlists.update(
      customerConnection,
      {
        wishlistId: wishlistEntry.id,
        body: { active: true },
      },
    );
  typia.assert(reactivatedEntry);
  // Validate reactivated state
  TestValidator.equals(
    "reactivated active status",
    reactivatedEntry.active,
    true,
  );
  TestValidator.equals(
    "reactivated deleted_at is null",
    reactivatedEntry.deleted_at,
    null,
  );
  TestValidator.notEquals(
    "updated_at changed after reactivation",
    reactivatedEntry.updated_at,
    deactivatedEntry.updated_at,
  );
  // 5. Validate all response fields are present and correctly typed
  TestValidator.equals(
    "customer id matches",
    reactivatedEntry.customer.id,
    customer.id,
  );
  TestValidator.equals(
    "customer email matches",
    reactivatedEntry.customer.email,
    customer.email,
  );
  TestValidator.predicate(
    "product has valid id",
    reactivatedEntry.product.id.length > 0,
  );
  TestValidator.predicate(
    "product has valid name",
    reactivatedEntry.product.name.length > 0,
  );
  TestValidator.predicate(
    "product has valid mainImageUrl",
    reactivatedEntry.product.mainImageUrl.length > 0,
  );
  TestValidator.predicate(
    "product has valid basePrice",
    reactivatedEntry.product.basePrice >= 0,
  );
  TestValidator.predicate(
    "has valid created_at",
    reactivatedEntry.created_at.length > 0,
  );
  TestValidator.predicate(
    "has valid updated_at",
    reactivatedEntry.updated_at.length > 0,
  );
}
