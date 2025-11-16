import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * This E2E test covers the update scenario for a shopping mall seller managed
 * by an admin user.
 *
 * It performs the following steps in order:
 *
 * 1. Register an admin user and obtain authentication token
 * 2. Create a new seller record to be updated
 * 3. Update the seller's information as an admin
 * 4. Validate that the updated seller information matches the update request
 *
 * The test confirms admin authorization controls update capabilities and
 * validates correct business state and data persistence.
 */
export async function test_api_admin_update_seller_information(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminInput = {
    email: typia.random<string & tags.Format<"email">>(),
    name: typia.random<string>(),
    password: "TestPassword123!",
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminInput,
    });
  typia.assert(admin);

  // 2. Create a seller
  const sellerInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "SellerPassword123!",
    name: typia.random<string>(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerInput,
    });
  typia.assert(seller);

  // 3. Prepare update data
  const updateInput = {
    name: `Updated ${seller.name}`,
    status: "active",
    business_status: "approved",
  } satisfies IShoppingMallSeller.IUpdate;

  // Update the seller information
  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      sellerId: seller.id,
      body: updateInput,
    });

  typia.assert(updatedSeller);

  // 4. Validate the update
  TestValidator.equals(
    "Seller ID should remain unchanged",
    updatedSeller.id,
    seller.id,
  );
  TestValidator.equals(
    "Seller name should be updated",
    updatedSeller.name,
    updateInput.name,
  );
  TestValidator.equals(
    "Seller status should be active",
    updatedSeller.status,
    updateInput.status,
  );
  TestValidator.equals(
    "Seller business status should be approved",
    updatedSeller.business_status,
    updateInput.business_status,
  );
}
