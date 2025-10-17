import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify the admin user can update seller account details.
 *
 * This test covers the workflow where an admin user creates an account,
 * authenticates, creates a seller account, and then updates the seller
 * account's details such as company name and status. It validates that only
 * authenticated admins can update sellers, and verifies the correct update.
 */
export async function test_api_admin_seller_account_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin user joins and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminPassword: string = "SamplePass1234";
  const adminCreateBody = {
    email: adminEmail,
    password_hash: adminPassword,
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(adminAuthorized);

  // 2. Create a new seller account
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: "SellerPass1234",
    company_name: RandomGenerator.name(),
    contact_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // 3. Update the seller account as admin
  const updatedCompanyName: string = RandomGenerator.name();
  const updatedStatus: string = "suspended";
  const sellerUpdateBody = {
    company_name: updatedCompanyName,
    status: updatedStatus,
  } satisfies IShoppingMallSeller.IUpdate;
  const updatedSeller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.update(connection, {
      id: seller.id,
      body: sellerUpdateBody,
    });
  typia.assert(updatedSeller);

  // 4. Validate that the update took effect
  TestValidator.equals(
    "seller id remains unchanged",
    updatedSeller.id,
    seller.id,
  );
  TestValidator.equals(
    "seller company name is updated",
    updatedSeller.company_name,
    updatedCompanyName,
  );
  TestValidator.equals(
    "seller status is updated",
    updatedSeller.status,
    updatedStatus,
  );
  TestValidator.equals(
    "seller email remains unchanged",
    updatedSeller.email,
    seller.email,
  );
  TestValidator.predicate(
    "updated seller has contact name",
    typeof updatedSeller.contact_name === "string" &&
      updatedSeller.contact_name !== null,
  );
  TestValidator.predicate(
    "updated seller has phone number",
    typeof updatedSeller.phone_number === "string" &&
      updatedSeller.phone_number !== null,
  );
}
