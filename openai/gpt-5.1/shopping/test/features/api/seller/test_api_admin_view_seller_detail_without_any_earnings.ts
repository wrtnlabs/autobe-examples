import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerAuthJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerAuthJoin";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";

/**
 * Validate admin can view details of a freshly onboarded seller with no
 * earnings.
 *
 * Business context:
 *
 * - Admins need to inspect seller accounts right after onboarding, even before
 *   the seller has configured catalog, received orders, or generated earnings.
 * - The admin detail endpoint must behave robustly for such empty-state sellers
 *   and must not leak or mix data between sellers.
 *
 * Test flow:
 *
 * 1. Register an admin account with POST /auth/admin/join.
 *
 *    - This populates connection.headers.Authorization with an admin access token.
 * 2. Register a seller account with POST /auth/seller/join.
 *
 *    - This overwrites Authorization header to a seller token.
 * 3. Re-register (or newly register) an admin using POST /auth/admin/join so that
 *    the Authorization header becomes an admin token again.
 * 4. As this admin, call GET /shoppingMall/admin/sellers/{sellerId} with the
 *    sellerId obtained from the seller join response.
 * 5. Assert that:
 *
 *    - Response conforms to IShoppingMallSeller via typia.assert.
 *    - Id matches the sellerId from the join response.
 *    - Email matches the seller email used on join.
 *    - Email_verified is a boolean and typically false for a fresh account.
 *    - Created_at and updated_at are valid date-time strings.
 *    - Deleted_at is null or undefined (seller is active).
 *    - Profile, if present, conforms to IShoppingMallSellerProfile and its
 *         shopping_mall_seller_id matches seller.id.
 * 6. Create a second seller, then again switch back to an admin and fetch details
 *    of the first sellerId; verify that the API returns the first seller and
 *    not the second, ensuring no data leak or mix-up.
 * 7. Call GET /shoppingMall/admin/sellers/{sellerId} twice for the same seller and
 *    verify idempotence by checking both responses are structurally equal using
 *    TestValidator.equals.
 */
export async function test_api_admin_view_seller_detail_without_any_earnings(
  connection: api.IConnection,
) {
  // 1. Register an admin (adminA) to obtain initial admin token
  const adminJoinBodyA = {
    email: `adminA+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminA: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBodyA,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminA);

  // 2. Register first seller (seller1) - this switches Authorization to seller token
  const sellerEmail1 = `seller1+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const sellerJoinBody1 = {
    email: sellerEmail1,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller1: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody1,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller1);

  // 3. Re-register another admin (adminB) to restore admin token in Authorization header
  const adminJoinBodyB = {
    email: `adminB+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminB: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBodyB,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminB);

  // 4. As adminB, fetch seller1 detail via admin endpoint
  const sellerDetail1: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId: seller1.id,
    });
  typia.assert<IShoppingMallSeller>(sellerDetail1);

  // Core field validations via TestValidator
  TestValidator.equals(
    "seller detail id should match seller1.id",
    sellerDetail1.id,
    seller1.id,
  );
  // Use plain string as first generic argument source for type compatibility
  TestValidator.equals(
    "seller detail email should match seller1 email",
    sellerEmail1,
    sellerDetail1.email,
  );

  // deleted_at should be null or undefined for a fresh seller
  TestValidator.predicate(
    "deleted_at should be null or undefined for fresh seller",
    sellerDetail1.deleted_at === null || sellerDetail1.deleted_at === undefined,
  );

  // If profile is present, ensure referential integrity
  if (sellerDetail1.profile !== undefined && sellerDetail1.profile !== null) {
    const profile: IShoppingMallSellerProfile = sellerDetail1.profile;
    typia.assert<IShoppingMallSellerProfile>(profile);
    TestValidator.equals(
      "profile.shopping_mall_seller_id should match seller id",
      profile.shopping_mall_seller_id,
      sellerDetail1.id,
    );
  }

  // 5. Create a second seller (seller2) and ensure no cross-leakage when fetching seller1
  const sellerEmail2 = `seller2+${RandomGenerator.alphaNumeric(8)}@example.com`;
  const sellerJoinBody2 = {
    email: sellerEmail2,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://seller.example.com/join",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerAuthJoin.IRequest;

  const seller2: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody2,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(seller2);

  // Switch back to admin context again to ensure Authorization is admin when calling admin endpoint
  const adminJoinBodyC = {
    email: `adminC+${RandomGenerator.alphaNumeric(8)}@example.com`,
    password: RandomGenerator.alphaNumeric(16),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminC: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBodyC,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminC);

  // Fetch seller1 detail again and ensure it still refers to seller1, not seller2
  const sellerDetail1Again: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId: seller1.id,
    });
  typia.assert<IShoppingMallSeller>(sellerDetail1Again);

  TestValidator.equals(
    "seller1 detail should remain associated with seller1.id",
    sellerDetail1Again.id,
    seller1.id,
  );
  TestValidator.notEquals(
    "seller1 detail id must not equal seller2.id",
    sellerDetail1Again.id,
    seller2.id,
  );

  // 6. Idempotence: calling the same endpoint twice returns equivalent data
  const sellerDetail1Third: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId: seller1.id,
    });
  typia.assert<IShoppingMallSeller>(sellerDetail1Third);

  TestValidator.equals(
    "seller detail responses for same seller should be structurally equal",
    sellerDetail1Again,
    sellerDetail1Third,
  );
}
