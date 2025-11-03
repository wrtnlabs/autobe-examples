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

export async function test_api_seller_session_retrieval_by_admin(
  connection: api.IConnection,
) {
  // Step 1: Admin user registration
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: "AdminPass123!",
    full_name: "Admin User",
  } satisfies IShoppingMallAdmin.IJoin;

  const adminUser: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminJoinBody });
  typia.assert(adminUser);

  // Step 2: Admin user login
  const adminLoginBody = {
    email: adminEmail,
    password: "AdminPass123!",
    ip: "192.168.1.1",
    href: "https://admin.shoppingmall.com/login",
    referrer: "https://admin.shoppingmall.com/",
  } satisfies IShoppingMallAdmin.ILogin;

  const adminLogged: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.login(connection, { body: adminLoginBody });
  typia.assert(adminLogged);

  // Step 3: Seller user registration
  const sellerEmail = typia.random<string & tags.Format<"email">>();
  const sellerJoinBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    store_name: "Seller Store",
  } satisfies IShoppingMallSeller.ICreate;

  const sellerUser: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerJoinBody });
  typia.assert(sellerUser);

  // Step 4: Seller user login
  const sellerLoginBody = {
    email: sellerEmail,
    password: "SellerPass123!",
    ip: "10.0.0.1",
    href: "https://seller.shoppingmall.com/login",
    referrer: "https://seller.shoppingmall.com/",
  } satisfies IShoppingMallSeller.ILogin;

  const sellerLogged: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(sellerLogged);

  // Step 5: Assign 'seller' role to the seller user
  const userRoleBody = {
    user_id: sellerUser.id,
    role_name: "seller",
  } satisfies IShoppingMallUserRole.ICreate;

  const userRole: IShoppingMallUserRole =
    await api.functional.shoppingMall.admin.userRoles.create(connection, {
      body: userRoleBody,
    });
  typia.assert(userRole);

  // Step 6: Create seller profile
  const nowIso = new Date().toISOString();
  const sellerProfileBody = {
    shopping_mall_seller_id: sellerUser.id,
    store_name: sellerUser.store_name,
    contact_email: sellerEmail,
    business_registration_number: "BRN123456",
    contact_phone: "010-1234-5678",
    profile_description: "Seller profile for test purposes",
    created_at: nowIso,
    updated_at: nowIso,
  } satisfies IShoppingMallSellerProfile.ICreate;

  const sellerProfile: IShoppingMallSellerProfile =
    await api.functional.shoppingMall.seller.sellerProfiles.create(connection, {
      body: sellerProfileBody,
    });
  typia.assert(sellerProfile);

  // Step 7: Retrieve seller session ID
  const sessions = sellerUser.shopping_mall_seller_sessions ?? [];
  // Use existing session if available, else simulate a random UUID
  const sessionId =
    sessions.length > 0
      ? sessions[0].id
      : typia.random<string & tags.Format<"uuid">>();

  // Step 8: Fetch seller session details by admin
  const sellerSession: IShoppingMallSellerSession =
    await api.functional.shoppingMall.admin.sellerSessions.at(connection, {
      id: sessionId,
    });
  typia.assert(sellerSession);

  // Step 9: Validate session fields
  TestValidator.predicate(
    "session ID is valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      sellerSession.id,
    ),
  );
  TestValidator.equals(
    "seller ID matches",
    sellerSession.shopping_mall_seller_id,
    sellerUser.id,
  );
  TestValidator.predicate(
    "IP address non-empty string",
    typeof sellerSession.ip === "string" && sellerSession.ip.length > 0,
  );
  TestValidator.predicate(
    "Href non-empty string",
    typeof sellerSession.href === "string" && sellerSession.href.length > 0,
  );
  TestValidator.predicate(
    "Referrer non-empty string",
    typeof sellerSession.referrer === "string" &&
      sellerSession.referrer.length > 0,
  );
  TestValidator.predicate(
    "Created at is ISO date-time string",
    typeof sellerSession.created_at === "string" &&
      !isNaN(Date.parse(sellerSession.created_at)),
  );

  // Step 10: Confirm error handling for invalid session ID retrieval
  await TestValidator.error("invalid session ID retrieval fails", async () => {
    const invalidId = "00000000-0000-0000-0000-000000000000" as string &
      tags.Format<"uuid">;
    await api.functional.shoppingMall.admin.sellerSessions.at(connection, {
      id: invalidId,
    });
  });
}
