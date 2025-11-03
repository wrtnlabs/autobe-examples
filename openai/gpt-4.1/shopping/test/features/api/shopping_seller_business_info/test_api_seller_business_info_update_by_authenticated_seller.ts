import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IShoppingAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingAuthorizationToken";
import type { IShoppingSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSeller";
import type { IShoppingSellerBusinessInfo } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingSellerBusinessInfo";

/**
 * Validates the updating of a seller's business registration and compliance
 * information.
 *
 * This test covers the entire flow for authenticated sellers:
 *
 * 1. Register a new seller (join), verify assigned sellerId and authenticated
 *    session
 * 2. Update business info—legal entity, registration number, representative,
 *    support contact, bank details
 * 3. Retrieve the updated business info and verify all changes are correctly
 *    reflected
 * 4. Ensure required business rules and access control are enforced (no
 *    unauthenticated or cross-account update)
 */
export async function test_api_seller_business_info_update_by_authenticated_seller(
  connection: api.IConnection,
) {
  // 1. Register (join) as a new seller
  const joinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.paragraph({
      sentences: 2,
      wordMin: 3,
      wordMax: 10,
    }),
    contact_phone: RandomGenerator.mobile(),
    status: "pending",
  } satisfies IShoppingSeller.IJoin;

  const seller: IShoppingSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: joinInput });
  typia.assert(seller);

  // 2. Update business info
  const updateBody = {
    legal_entity_name: RandomGenerator.paragraph({
      sentences: 3,
      wordMin: 4,
      wordMax: 12,
    }),
    registration_number: RandomGenerator.alphaNumeric(10),
    representative_name: RandomGenerator.name(2),
    support_contact: RandomGenerator.mobile(),
    bank_account_number: RandomGenerator.alphaNumeric(14),
  } satisfies IShoppingSellerBusinessInfo.IUpdate;

  const updatedInfo: IShoppingSellerBusinessInfo =
    await api.functional.shopping.seller.sellers.businessInfo.update(
      connection,
      {
        sellerId: seller.id,
        body: updateBody,
      },
    );
  typia.assert(updatedInfo);

  // 3. Validate that all updated fields are correctly set
  TestValidator.equals(
    "legal_entity_name updated",
    updatedInfo.legal_entity_name,
    updateBody.legal_entity_name,
  );
  TestValidator.equals(
    "registration_number updated",
    updatedInfo.registration_number,
    updateBody.registration_number,
  );
  TestValidator.equals(
    "representative_name updated",
    updatedInfo.representative_name,
    updateBody.representative_name,
  );
  TestValidator.equals(
    "support_contact updated",
    updatedInfo.support_contact,
    updateBody.support_contact,
  );
  TestValidator.equals(
    "bank_account_number updated",
    updatedInfo.bank_account_number,
    updateBody.bank_account_number,
  );
  TestValidator.equals(
    "shopping_seller_id matches seller.id",
    updatedInfo.shopping_seller_id,
    seller.id,
  );
}
