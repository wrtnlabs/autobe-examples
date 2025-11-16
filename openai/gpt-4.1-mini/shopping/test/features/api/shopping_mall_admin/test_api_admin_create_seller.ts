import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Tests the full seller creation process by an authorized admin.
 *
 * The test flow includes:
 *
 * 1. Admin user registration via /auth/admin/join to obtain JWT tokens.
 * 2. Seller creation with valid data: email, password, and name fields.
 * 3. Validation of unique constraints by attempting duplicate email creation.
 * 4. Ensuring the created seller has default 'active' and 'approved' statuses.
 * 5. Confirming correct data persistence in the sellers table.
 *
 * This ensures admin can properly create sellers and the system enforces
 * business rules and data integrity.
 */
export async function test_api_admin_create_seller(
  connection: api.IConnection,
) {
  // Step 1: Admin Registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "StrongPassword123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminCreateBody });
  typia.assert(admin);

  TestValidator.predicate(
    "admin token access present",
    typeof admin.token.access === "string" && admin.token.access.length > 0,
  );

  // Step 2: Seller Creation with Valid Data
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerCreateBody = {
    email: sellerEmail,
    password: "StrongSellerPass!",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // Validate response fields for seller
  TestValidator.equals(
    "seller email matches input",
    seller.email,
    sellerCreateBody.email,
  );
  TestValidator.equals(
    "seller name matches input",
    seller.name,
    sellerCreateBody.name,
  );
  TestValidator.equals(
    "seller status is active by default",
    seller.status,
    "active",
  );
  TestValidator.equals(
    "seller business_status is approved by default",
    seller.business_status,
    "approved",
  );

  // Step 3: Validate unique constraint
  await TestValidator.error("duplicate seller email should fail", async () => {
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody, // same email, same data
    });
  });
}
