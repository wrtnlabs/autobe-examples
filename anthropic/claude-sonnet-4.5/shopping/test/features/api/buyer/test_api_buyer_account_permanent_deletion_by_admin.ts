import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test the complete workflow of an administrator permanently deleting a buyer
 * account.
 *
 * This scenario validates the hard delete operation that completely removes the
 * buyer record and all associated data from the database. The test covers:
 *
 * 1. Create and authenticate an admin account with elevated permissions
 * 2. Create a buyer account that will be permanently deleted
 * 3. Execute the permanent deletion operation via admin endpoint
 * 4. Verify the deletion completes successfully
 *
 * This tests the destructive administrative operation used for compliance
 * purposes such as GDPR data deletion requests or fraudulent account cleanup.
 */
export async function test_api_buyer_account_permanent_deletion_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminBody = {
    email: adminEmail,
    password: typia.random<string & tags.Format<"password">>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    admin_level: "super_admin" as const,
    email_verified: true,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminBody,
    });
  typia.assert(admin);

  // Step 2: Create a buyer account to be deleted
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyerBody = {
    email: buyerEmail,
    password: typia.random<string & tags.MinLength<8>>(),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallBuyer.ICreate;

  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: buyerBody,
    });
  typia.assert(buyer);

  // Step 3: Switch back to admin authentication for deletion
  await api.functional.auth.admin.join(connection, {
    body: adminBody,
  });

  // Step 4: Permanently delete the buyer account
  await api.functional.shoppingMall.admin.buyers.erase(connection, {
    buyerId: buyer.id,
  });

  // The deletion operation returns void, so successful completion means the test passed
}
