import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallBuyer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBuyer";

/**
 * Test administrator's ability to manage buyer phone numbers through complete
 * lifecycle.
 *
 * This test validates that administrators can comprehensively manage buyer
 * phone numbers including adding phone numbers to accounts that don't have one,
 * updating existing phone numbers to different values, and removing phone
 * numbers by setting them to null.
 *
 * The test demonstrates the optional nature of the phone_number field in buyer
 * accounts and ensures data integrity is maintained throughout all phone number
 * management operations.
 *
 * Test Flow:
 *
 * 1. Create and authenticate admin account
 * 2. Create buyer account without phone number (null)
 * 3. Add phone number to buyer account
 * 4. Update phone number to different value
 * 5. Remove phone number by setting to null
 * 6. Validate all operations maintain data integrity
 */
export async function test_api_buyer_phone_number_management_by_admin(
  connection: api.IConnection,
) {
  // Phase 1: Setup - Create and authenticate admin account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password: typia.random<string & tags.Format<"password">>(),
        full_name: RandomGenerator.name(),
        phone_number: RandomGenerator.mobile("+82"),
        admin_level: "super_admin",
        email_verified: true,
        ip: "127.0.0.1",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // Phase 2: Create buyer account WITHOUT phone number
  const buyerEmail = typia.random<string & tags.Format<"email">>();
  const buyer: IShoppingMallBuyer.IAuthorized =
    await api.functional.auth.buyer.join(connection, {
      body: {
        email: buyerEmail,
        password: "securePass123",
        full_name: RandomGenerator.name(),
        phone_number: null,
        ip: "192.168.1.100",
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IShoppingMallBuyer.ICreate,
    });
  typia.assert(buyer);

  // Validate buyer was created without phone number
  TestValidator.equals(
    "buyer initially has no phone number",
    buyer.phone_number,
    null,
  );

  // Phase 3: Add phone number to buyer account
  const firstPhoneNumber = RandomGenerator.mobile("+1");
  const buyerWithPhone: IShoppingMallBuyer =
    await api.functional.shoppingMall.admin.buyers.update(connection, {
      buyerId: buyer.id,
      body: {
        phone_number: firstPhoneNumber,
      } satisfies IShoppingMallBuyer.IUpdate,
    });
  typia.assert(buyerWithPhone);

  // Validate phone number was added successfully
  TestValidator.equals(
    "phone number was added successfully",
    buyerWithPhone.phone_number,
    firstPhoneNumber,
  );
  TestValidator.equals(
    "buyer ID remains unchanged",
    buyerWithPhone.id,
    buyer.id,
  );
  TestValidator.equals(
    "buyer email remains unchanged",
    buyerWithPhone.email,
    buyer.email,
  );

  // Phase 4: Update phone number to different value
  const secondPhoneNumber = RandomGenerator.mobile("+44");
  const buyerWithUpdatedPhone: IShoppingMallBuyer =
    await api.functional.shoppingMall.admin.buyers.update(connection, {
      buyerId: buyer.id,
      body: {
        phone_number: secondPhoneNumber,
      } satisfies IShoppingMallBuyer.IUpdate,
    });
  typia.assert(buyerWithUpdatedPhone);

  // Validate phone number was updated successfully
  TestValidator.equals(
    "phone number was updated to new value",
    buyerWithUpdatedPhone.phone_number,
    secondPhoneNumber,
  );
  TestValidator.notEquals(
    "phone number changed from previous value",
    buyerWithUpdatedPhone.phone_number,
    firstPhoneNumber,
  );
  TestValidator.equals(
    "buyer ID remains unchanged",
    buyerWithUpdatedPhone.id,
    buyer.id,
  );

  // Phase 5: Remove phone number by setting to null
  const buyerWithoutPhone: IShoppingMallBuyer =
    await api.functional.shoppingMall.admin.buyers.update(connection, {
      buyerId: buyer.id,
      body: {
        phone_number: null,
      } satisfies IShoppingMallBuyer.IUpdate,
    });
  typia.assert(buyerWithoutPhone);

  // Validate phone number was removed successfully
  TestValidator.equals(
    "phone number was removed successfully",
    buyerWithoutPhone.phone_number,
    null,
  );
  TestValidator.equals(
    "buyer ID remains unchanged",
    buyerWithoutPhone.id,
    buyer.id,
  );
  TestValidator.equals(
    "buyer email remains unchanged",
    buyerWithoutPhone.email,
    buyer.email,
  );
}
