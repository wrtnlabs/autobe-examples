import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Test that an administrator can successfully retrieve detailed information of
 * a specific seller by their unique identifier.
 *
 * The scenario covers authenticating as an admin using the admin join
 * operation, and then querying the seller detail endpoint with an existing
 * seller ID. Validate that all returned seller fields are correct and
 * accessible only by the admin role.
 *
 * Also validate the system returns proper error responses when the seller ID
 * does not exist or when unauthorized users attempt access.
 */
export async function test_api_shopping_mall_admin_seller_retrieve_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin signs up and authenticates
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminCreateBody = {
    email: adminEmail,
    password_hash: RandomGenerator.alphaNumeric(64),
    full_name: RandomGenerator.name(),
    phone_number: RandomGenerator.mobile(),
    status: "active",
  } satisfies IShoppingMallAdmin.ICreate;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // 2. Admin creates a new seller account
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(64),
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

  // Validate that created seller's email matches the input
  TestValidator.equals(
    "created seller email matches",
    seller.email,
    sellerCreateBody.email,
  );

  // 3. Admin retrieves seller details by ID
  const sellerRead: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      id: seller.id,
    });
  typia.assert(sellerRead);

  // Validate returned data matches created data
  TestValidator.equals("retrieved seller id matches", sellerRead.id, seller.id);
  TestValidator.equals(
    "retrieved seller email matches",
    sellerRead.email,
    seller.email,
  );
  TestValidator.equals(
    "retrieved seller company name matches",
    sellerRead.company_name,
    seller.company_name,
  );
  TestValidator.equals(
    "retrieved seller contact name matches",
    sellerRead.contact_name,
    seller.contact_name,
  );
  TestValidator.equals(
    "retrieved seller phone number matches",
    sellerRead.phone_number,
    seller.phone_number,
  );
  TestValidator.equals(
    "retrieved seller status matches",
    sellerRead.status,
    seller.status,
  );

  // 4. Test retrieval of non-existent seller ID returns error
  await TestValidator.error(
    "retrieving non-existent seller fails",
    async () => {
      await api.functional.shoppingMall.admin.sellers.at(connection, {
        id: typia.random<string & tags.Format<"uuid">>(),
      });
    },
  );

  // 5. Test unauthorized access fails
  const unauthConnection: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "unauthorized seller detail access fails",
    async () => {
      await api.functional.shoppingMall.admin.sellers.at(unauthConnection, {
        id: seller.id,
      });
    },
  );
}
