import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_user_role_create_for_seller(
  connection: api.IConnection,
) {
  // Step 1. Create seller user account
  const sellerCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    store_name: `Store ${RandomGenerator.paragraph({ sentences: 2, wordMin: 4, wordMax: 8 })}`,
  } satisfies IShoppingMallSeller.ICreate;
  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerCreateBody,
    });
  typia.assert(seller);

  // Step 2. Create admin user account
  const adminCreateBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "AdminPass!23",
    full_name: RandomGenerator.name(2),
  } satisfies IShoppingMallAdmin.IJoin;
  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminCreateBody,
    });
  typia.assert(admin);

  // Step 3. Login as admin to establish admin authenticated session
  const adminLoginBody = {
    email: admin.email,
    password: adminCreateBody.password,
    ip: null,
    href: "https://example.com/login",
    referrer: "https://example.com",
  } satisfies IShoppingMallAdmin.ILogin;
  const adminAuth: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminAuth);

  // Step 4. Use admin authenticated session to create user role for the seller
  const userRoleCreateBody = {
    user_id: seller.id,
    role_name: "seller",
  } satisfies IShoppingMallUserRole.ICreate;
  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleCreateBody,
    });
  typia.assert(userRole);

  // Verify created user role fields
  TestValidator.equals(
    "user role user_id matches seller id",
    userRole.user_id,
    seller.id,
  );
  TestValidator.equals(
    "user role role_name is 'seller'",
    userRole.role_name,
    "seller",
  );
  TestValidator.predicate(
    "user role id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      userRole.id,
    ),
  );
}
