import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerProfile";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";
import type { IShoppingMallUserRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserRole";

export async function test_api_user_role_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Admin joins (registers) the system
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = "AdminPassword123!";
  const adminJoinBody = {
    email: adminEmail,
    password: adminPassword,
    full_name: RandomGenerator.name(),
  } satisfies IShoppingMallAdmin.IJoin;

  const admin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);

  // 2. Admin logins to ensure authentication context
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://localhost/login",
    referrer: "https://localhost/",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(adminLogged);

  // 3. Seller joins the system
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerPassword = "SellerPassword123!";
  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    store_name: RandomGenerator.name(),
  } satisfies IShoppingMallSeller.ICreate;

  const seller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(seller);

  // 4. Seller login to ensure authentication context
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://localhost/login",
    referrer: "https://localhost/",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerLogged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogged);

  // 5. Customer joins the system
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = "CustomerPassword123!";
  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    nickname: RandomGenerator.name(),
  } satisfies IShoppingMallCustomer.ICreate;

  const customer: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customer);

  // 6. Customer login to ensure authentication context
  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://localhost/login",
    referrer: "https://localhost/",
  } satisfies IShoppingMallCustomer.ILogin;

  const customerLogged: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(customerLogged);

  // 7. Admin creates user role assignments for the three actor users
  // for Admin role
  const adminRoleBody: IShoppingMallUserRole.ICreate = {
    user_id: admin.id,
    role_name: "admin",
  } satisfies IShoppingMallUserRole.ICreate;

  const createdAdminRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: adminRoleBody,
    });
  typia.assert(createdAdminRole);
  TestValidator.equals(
    "admin role user_id",
    createdAdminRole.user_id,
    admin.id,
  );
  TestValidator.equals(
    "admin role role_name",
    createdAdminRole.role_name,
    "admin",
  );

  // for Seller role
  const sellerRoleBody: IShoppingMallUserRole.ICreate = {
    user_id: seller.id,
    role_name: "seller",
  } satisfies IShoppingMallUserRole.ICreate;

  const createdSellerRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: sellerRoleBody,
    });
  typia.assert(createdSellerRole);
  TestValidator.equals(
    "seller role user_id",
    createdSellerRole.user_id,
    seller.id,
  );
  TestValidator.equals(
    "seller role role_name",
    createdSellerRole.role_name,
    "seller",
  );

  // for Customer role
  const customerRoleBody: IShoppingMallUserRole.ICreate = {
    user_id: customer.id,
    role_name: "customer",
  } satisfies IShoppingMallUserRole.ICreate;

  const createdCustomerRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: customerRoleBody,
    });
  typia.assert(createdCustomerRole);
  TestValidator.equals(
    "customer role user_id",
    createdCustomerRole.user_id,
    customer.id,
  );
  TestValidator.equals(
    "customer role role_name",
    createdCustomerRole.role_name,
    "customer",
  );
}
