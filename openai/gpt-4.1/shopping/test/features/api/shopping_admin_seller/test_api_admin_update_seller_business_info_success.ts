import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAdmin";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSellerAddress } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerAddress";
import type { IShoppingSellerBusinessInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerBusinessInfo";

/**
 * Verify successful admin update to seller business registration info.
 *
 * 1. Join as a new admin account (to represent the authorized admin).
 * 2. Create a seller and address in the admin context to initialize sellerId
 *    (required).
 * 3. Prepare legal, valid KYC/business info for the update.
 * 4. Call admin seller businessInfo update with that sellerId and new business
 *    info.
 * 5. Confirm all returned business info fields match exactly what was sent.
 */
export async function test_api_admin_update_seller_business_info_success(
  connection: api.IConnection,
) {
  // 1. Admin joins
  const adminJoinBody = {
    email: `${RandomGenerator.alphabets(8)}@testcompany.com`,
    password: `${RandomGenerator.alphaNumeric(12)}A!1`,
    name: RandomGenerator.name(),
    role: "superadmin",
    status: "active",
  } satisfies IShoppingAdmin.IJoin;
  const admin: IShoppingAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(admin);

  // 2. Create initial seller (via address creation) to get a sellerId
  const sellerId = typia.random<string & tags.Format<"uuid">>();
  const addressBody = {
    address_line1: RandomGenerator.paragraph({ sentences: 2 }),
    address_line2: RandomGenerator.paragraph({ sentences: 1 }),
    city: RandomGenerator.name(1),
    state: RandomGenerator.name(1),
    postal_code: RandomGenerator.alphaNumeric(5),
    country: "South Korea",
    is_primary: true,
    is_return_address: true,
    phone: RandomGenerator.mobile(),
    recipient_name: RandomGenerator.name(2),
  } satisfies IShoppingSellerAddress.ICreate;
  const address: IShoppingSellerAddress =
    await api.functional.shopping.admin.sellers.addresses.create(connection, {
      sellerId,
      body: addressBody,
    });
  typia.assert(address);
  TestValidator.equals(
    "sellerId initialized via address creation",
    address.shopping_seller_id,
    sellerId,
  );

  // 3. Prepare new business registration info (full replacement, all fields)
  const businessInfoUpdate = {
    legal_entity_name: RandomGenerator.paragraph({ sentences: 3 }),
    registration_number: RandomGenerator.alphaNumeric(10),
    representative_name: RandomGenerator.name(2),
    support_contact: `${RandomGenerator.mobile()}`,
    bank_account_number: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingSellerBusinessInfo.IUpdate;

  // 4. Update seller business registration information
  const updated: IShoppingSellerBusinessInfo =
    await api.functional.shopping.admin.sellers.businessInfo.update(
      connection,
      { sellerId, body: businessInfoUpdate },
    );
  typia.assert(updated);
  // 5. Validation: Ensure all fields are completely and correctly replaced by update
  TestValidator.equals(
    "legal entity name",
    updated.legal_entity_name,
    businessInfoUpdate.legal_entity_name,
  );
  TestValidator.equals(
    "registration number",
    updated.registration_number,
    businessInfoUpdate.registration_number,
  );
  TestValidator.equals(
    "representative name",
    updated.representative_name,
    businessInfoUpdate.representative_name,
  );
  TestValidator.equals(
    "support contact",
    updated.support_contact,
    businessInfoUpdate.support_contact,
  );
  TestValidator.equals(
    "bank account number",
    updated.bank_account_number,
    businessInfoUpdate.bank_account_number,
  );
  TestValidator.equals(
    "business info seller id reference",
    updated.shopping_seller_id,
    sellerId,
  );
}
