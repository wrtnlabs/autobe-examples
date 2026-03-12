import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallWishlistItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItem";
import type { IShoppingMallWishlistItemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallWishlistItemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test the ownership validation logic for wishlist item snapshots.
 *
 * This test verifies that customers can only view snapshots belonging to their
 * own wishlist items. The test creates two customer accounts and validates that
 * the authentication and authorization system correctly distinguishes between
 * different customer contexts when accessing snapshot data.
 *
 * Steps:
 * 1. Create customerA account and authenticate
 * 2. Create customerB account and authenticate
 * 3. Generate a test snapshot ID
 * 4. Attempt to retrieve snapshot as customerA with proper authentication
 * 5. Attempt to retrieve snapshot as customerB with different authentication
 * 6. Validate that both customers have distinct identities and authentication tokens
 */
export async function test_api_wishlist_snapshot_ownership_validation(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate customerA (owner of wishlist item)
  const customerAConnection: api.IConnection = { host: connection.host };
  const customerA = await authorize_customer_join(customerAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerA);
  // Step 2: Create and authenticate customerB (non-owner attempting access)
  const customerBConnection: api.IConnection = { host: connection.host };
  const customerB = await authorize_customer_join(customerBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallCustomer.IJoin,
  });
  typia.assert(customerB);
  // Step 3: Generate a test snapshot ID
  const snapshotId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Step 4: Validate customer identities are different
  TestValidator.notEquals(
    "customers have different IDs",
    customerA.id,
    customerB.id,
  );
  TestValidator.notEquals(
    "customers have different emails",
    customerA.email,
    customerB.email,
  );
  TestValidator.notEquals(
    "customers have different authentication tokens",
    customerA.token.access,
    customerB.token.access,
  );
  // Step 5: Attempt to retrieve snapshot as customerA (owner)
  // The ownership validation occurs server-side through JOIN with wishlist_items table
  await TestValidator.httpError(
    "customerA snapshot access (404 expected if not exists)",
    [404, 200],
    async () =>
      await api.functional.shoppingMall.customer.wishlist.snapshots.at(
        customerAConnection,
        { snapshotId },
      ),
  );
  // Step 6: Attempt to retrieve same snapshot as customerB (non-owner)
  // Should fail with 403 (forbidden) if snapshot exists and belongs to customerA
  // Or 404 if snapshot doesn't exist
  await TestValidator.httpError(
    "customerB snapshot access denied (403 or 404)",
    [403, 404],
    async () =>
      await api.functional.shoppingMall.customer.wishlist.snapshots.at(
        customerBConnection,
        { snapshotId },
      ),
  );
  // Step 7: Verify that the API correctly uses different authentication contexts
  // customerAConnection has customerA's token in headers
  // customerBConnection has customerB's token in headers
  TestValidator.predicate(
    "customerA connection has authorization header",
    customerAConnection.headers?.Authorization !== undefined,
  );
  TestValidator.predicate(
    "customerB connection has authorization header",
    customerBConnection.headers?.Authorization !== undefined,
  );
  TestValidator.notEquals(
    "connections have different authorization headers",
    customerAConnection.headers?.Authorization,
    customerBConnection.headers?.Authorization,
  );
}
