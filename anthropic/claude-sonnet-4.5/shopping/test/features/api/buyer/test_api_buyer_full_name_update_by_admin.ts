import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test administrator's ability to update a buyer's full name for account
 * corrections.
 *
 * This test validates that administrators can successfully modify buyer account
 * full names to support customer service operations, delivery accuracy, and
 * legal compliance requirements.
 *
 * Test workflow:
 *
 * 1. Create and authenticate an admin account with super_admin privileges
 * 2. Create a buyer account with an initial full name
 * 3. Admin updates the buyer's full name to a new valid value
 * 4. Verify the update was successful and the response contains the modified name
 */
export async function test_api_buyer_full_name_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        admin_level: "super_admin",
        email_verified: true,
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Step 2: Create a buyer account with initial full name
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const initialFullName = RandomGenerator.name();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: initialFullName,
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 3: Admin updates the buyer's full name
  const newFullName = RandomGenerator.name();
  const updatedBuyer: IShoppingMallBuyer =
    await api.functional.shoppingMall.admin.buyers.update(connection, {
      buyerId: buyer.id,
      body: {
        full_name: newFullName,
      } satisfies IShoppingMallBuyer.IUpdate,
    });
  typia.assert(updatedBuyer);

  // Step 4: Verify the full name was successfully updated
  TestValidator.equals(
    "buyer full name updated successfully",
    updatedBuyer.full_name,
    newFullName,
  );
  TestValidator.notEquals(
    "buyer full name changed from initial value",
    updatedBuyer.full_name,
    initialFullName,
  );
  TestValidator.equals("buyer ID remains unchanged", updatedBuyer.id, buyer.id);
  TestValidator.equals(
    "buyer email remains unchanged",
    updatedBuyer.email,
    buyer.email,
  );
}
