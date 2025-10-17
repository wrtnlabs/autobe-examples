import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test admin updating existing seller account details.
 *
 * Steps:
 *
 * 1. Authenticate as admin.
 * 2. Create a seller account to update.
 * 3. Modify fields such as company name, contact info, and status.
 * 4. Verify updates are applied correctly.
 * 5. Test authorization to prevent unauthorized updates.
 *
 * Purpose is to validate admin seller account management functions.
 */
export async function test_api_admin_update_seller_information(
  connection: api.IConnection,
) {
  // 1. Authenticate as admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "securePass123";
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: {
        email: adminEmail,
        password_hash: adminPassword,
        full_name: "Admin User",
        phone_number: "+821012345678",
        status: "active",
      } satisfies IShoppingMallAdmin.ICreate,
    });
  typia.assert(admin);

  // 2. Create a seller account to update
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPasswordHash = "sellerPass123Hash";
  const createdSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: {
        email: sellerEmail,
        password_hash: sellerPasswordHash,
        company_name: "Old Company Name",
        contact_name: "Old Contact",
        phone_number: "+821098765432",
        status: "active",
      } satisfies IShoppingMallSeller.ICreate,
    });
  typia.assert(createdSeller);

  // 3. Modify fields such as company name, contact info, and status
  const updateBody = {
    company_name: "New Company Name",
    contact_name: "New Contact Name",
    phone_number: "+821011122233",
    status: "suspended",
  } satisfies IShoppingMallSeller.IUpdate;

  // 4. Perform update
  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      id: createdSeller.id,
      body: updateBody,
    });
  typia.assert(updatedSeller);

  // 5. Verify updates are applied correctly
  TestValidator.equals(
    "company_name updated",
    updatedSeller.company_name,
    updateBody.company_name,
  );
  TestValidator.equals(
    "contact_name updated",
    updatedSeller.contact_name,
    updateBody.contact_name,
  );
  TestValidator.equals(
    "phone_number updated",
    updatedSeller.phone_number,
    updateBody.phone_number,
  );
  TestValidator.equals(
    "status updated",
    updatedSeller.status,
    updateBody.status,
  );
}
