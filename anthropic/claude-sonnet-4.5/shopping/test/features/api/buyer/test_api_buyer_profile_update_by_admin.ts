import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test the complete workflow of an administrator updating a buyer's profile
 * information.
 *
 * This test validates that admins can successfully modify buyer account details
 * including full name, email, and phone number through the admin-specific buyer
 * update endpoint.
 *
 * Test Flow:
 *
 * 1. Create and authenticate admin account
 * 2. Create buyer account to be updated
 * 3. Admin updates buyer's profile information
 * 4. Verify all changes are correctly applied
 */
export async function test_api_buyer_profile_update_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Create admin account
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

  // Step 2: Create buyer account
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: typia.random<string & tags.MinLength<8>>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Step 3: Admin updates buyer profile
  const updatedFullName = RandomGenerator.name();
  const updatedEmail = typia.random<string & tags.Format<"email">>();
  const updatedPhoneNumber = RandomGenerator.mobile();

  const updatedBuyer: IShoppingMallBuyer =
    await api.functional.shoppingMall.admin.buyers.update(connection, {
      buyerId: buyer.id,
      body: {
        full_name: updatedFullName,
        email: updatedEmail,
        phone_number: updatedPhoneNumber,
      } satisfies IShoppingMallBuyer.IUpdate,
    });
  typia.assert(updatedBuyer);

  // Step 4: Verify all changes are applied correctly
  TestValidator.equals(
    "updated full name matches",
    updatedBuyer.full_name,
    updatedFullName,
  );
  TestValidator.equals(
    "updated email matches",
    updatedBuyer.email,
    updatedEmail,
  );
  TestValidator.equals(
    "updated phone number matches",
    updatedBuyer.phone_number,
    updatedPhoneNumber,
  );
  TestValidator.equals("buyer ID unchanged", updatedBuyer.id, buyer.id);

  // Step 5: Test updating with null phone_number
  const updatedBuyerWithNullPhone: IShoppingMallBuyer =
    await api.functional.shoppingMall.admin.buyers.update(connection, {
      buyerId: buyer.id,
      body: {
        phone_number: null,
      } satisfies IShoppingMallBuyer.IUpdate,
    });
  typia.assert(updatedBuyerWithNullPhone);
  TestValidator.equals(
    "phone number set to null",
    updatedBuyerWithNullPhone.phone_number,
    null,
  );
}
