import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test to retrieve detailed seller account information by the seller's UUID
 * using admin authentication.
 *
 * This test covers the multi-actor authentication scenario, where both admin
 * and seller accounts are created and logged in prior to retrieving seller
 * details.
 *
 * Steps:
 *
 * 1. Admin account creation and login
 * 2. Seller account creation and login
 * 3. Using the admin token, retrieve seller details by seller ID
 * 4. Validate that seller details are correctly retrieved and sensitive
 *    information, such as password_hash, is not present in the response
 * 5. Validate the response schema and business logic consistency
 */

export async function test_api_seller_detail_retrieval_by_admin(
  connection: api.IConnection,
) {
  // 1. Create and authenticate admin user
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "StrongP@ssw0rd!",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  await api.functional.auth.admin.login(connection, {
    body: {
      email: adminEmail,
      password: "StrongP@ssw0rd!",
      ip: null,
      href: "https://admin.login.test/",
      referrer: "https://admin.referrer.test/",
    } satisfies IShoppingMallAdmin.ILogin,
  });

  // 2. Create and authenticate seller user
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerP@ss123",
    store_name: RandomGenerator.name(3),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  await api.functional.auth.seller.login(connection, {
    body: {
      email: sellerEmail,
      password: "SellerP@ss123",
      ip: null,
      href: "https://seller.login.test/",
      referrer: "https://seller.referrer.test/",
    } satisfies IShoppingMallSeller.ILogin,
  });

  // 3. Admin retrieves seller details by seller ID
  const fetchedSeller: IShoppingMallSeller.ISummary =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      id: seller.id,
    });
  typia.assert(fetchedSeller);

  // 4. Validate response
  // Checking essential fields
  TestValidator.equals("seller id matches", fetchedSeller.id, seller.id);
  TestValidator.equals(
    "seller email matches",
    fetchedSeller.email,
    seller.email,
  );
  TestValidator.predicate(
    "store name exists",
    fetchedSeller.store_name.length > 0,
  );

  // 5. Validate sensitive fields such as password_hash are not present
  // We confirm that fetchedSeller does not have 'password_hash' property.
  // Since JS objects can have extra properties, we check explicitly
  TestValidator.predicate(
    "response does not expose password hash",
    !("password_hash" in fetchedSeller),
  );

  // 6. Confirm that optional properties exist or are null as per schema
  if (
    fetchedSeller.deleted_at !== null &&
    fetchedSeller.deleted_at !== undefined
  ) {
    typia.assert(fetchedSeller.deleted_at);
  }

  if (fetchedSeller.profile !== null && fetchedSeller.profile !== undefined) {
    typia.assert<IShoppingMallSellerProfile>(fetchedSeller.profile);
    TestValidator.predicate(
      "profile has contact_email",
      fetchedSeller.profile.contact_email.length > 0,
    );
  }

  TestValidator.predicate(
    "is_active is boolean",
    typeof fetchedSeller.is_active === "boolean",
  );
}
