import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

export async function test_api_shopping_mall_admin_sellers_sellerid_get_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin authentication by joining a new admin user
  const adminEmail: string = `admin${RandomGenerator.alphaNumeric(4)}@example.com`;
  const adminInput = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: "StrongPassword123!",
    phone_number: null,
    role: "admin",
  } satisfies IShoppingMallAdmin.ICreate;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminInput });
  typia.assert(admin);
  TestValidator.equals("admin role must be admin", admin.role, "admin");

  // 2. Create a new seller user to later retrieve
  const sellerCreateInput = {
    email: `seller${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "SellerPass2025$",
    name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.create(connection, {
      body: sellerCreateInput,
    });
  typia.assert(seller);
  TestValidator.equals(
    "seller email matches input",
    seller.email,
    sellerCreateInput.email,
  );

  // 3. Fetch the seller's details as the authenticated admin
  const sellerDetails: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.sellers.at(connection, {
      sellerId: seller.id,
    });
  typia.assert(sellerDetails);
  TestValidator.equals("fetched seller ID match", sellerDetails.id, seller.id);
  TestValidator.equals(
    "fetched seller email match",
    sellerDetails.email,
    seller.email,
  );
  TestValidator.equals(
    "fetched seller name match",
    sellerDetails.name,
    seller.name,
  );

  // 4. Sensitive information like password hashes should not be present
  // (Implicitly confirmed since IShoppingMallSeller schema does not include password)
  TestValidator.predicate(
    "sellerDetails should not have deleted_at field set if active",
    sellerDetails.deleted_at === null || sellerDetails.deleted_at === undefined,
  );
}
