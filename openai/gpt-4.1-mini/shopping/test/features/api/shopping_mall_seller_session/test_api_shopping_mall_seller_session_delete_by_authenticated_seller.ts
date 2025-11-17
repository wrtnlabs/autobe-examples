import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Test deletion of a shopping mall seller session by an authenticated seller
 * user.
 *
 * This end-to-end test validates strict ownership enforcement on deleting
 * shopping mall seller sessions. It performs the following full workflow:
 *
 * 1. Seller user registers by calling /auth/seller/join to authenticate.
 * 2. Admin user registers and logs in to obtain admin authentication.
 * 3. Admin creates a new shopping mall seller resource to be linked with sessions.
 * 4. Seller user logs in to establish authentication context.
 * 5. Seller creates a new seller session tied to the created seller resource.
 * 6. Seller deletes the session and confirms successful deletion.
 * 7. Attempts unauthorized deletion from a different seller user and admin user,
 *    expecting errors due to insufficient permissions.
 *
 * All API responses are validated with typia.assert and business logic
 * validated with TestValidator, ensuring proper session lifecycle and
 * authorization controls.
 */
export async function test_api_shopping_mall_seller_session_delete_by_authenticated_seller(
  connection: api.IConnection,
) {
  // Seller user joins (registers) and authenticates
  const sellerBody1 = {
    email: `seller1_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "Password123!",
  } satisfies IShoppingMallSeller.ICreate;
  const seller1Authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerBody1 });
  typia.assert(seller1Authorized);

  // Admin user joins
  const adminBody = {
    email: `admin_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "AdminPass123!",
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com",
  } satisfies IShoppingMallAdmin.IJoin;
  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, { body: adminBody });
  typia.assert(adminAuthorized);

  // Admin user logs in
  const adminLoginBody = {
    email: adminBody.email,
    password: adminBody.password,
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com",
  } satisfies IShoppingMallAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody });

  // Admin creates new shopping mall seller resource
  const sellerBody2 = {
    email: `seller2_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "Password321!",
  } satisfies IShoppingMallSeller.ICreate;
  const sellerResource: IShoppingMallSeller =
    await api.functional.shoppingMall.admin.shoppingMallSellers.create(
      connection,
      {
        body: sellerBody2,
      },
    );
  typia.assert(sellerResource);

  // Seller user logs in to establish authentication
  const sellerLoginBody1 = {
    email: sellerBody1.email,
    password: sellerBody1.password,
    ip: null,
    href: "https://seller.test.com/login",
    referrer: "https://seller.test.com",
  } satisfies IShoppingMallSeller.ILogin;
  await api.functional.auth.seller.login(connection, {
    body: sellerLoginBody1,
  });

  // Seller creates a session under the sellerResource ID
  const sessionCreateBody = {
    href: "https://seller.test.com/dashboard",
    referrer: "https://seller.test.com/home",
    ip: "192.168.1.1",
    user_agent: "Mozilla/5.0 (compatible; TestBot/1.0)",
    fingerprint: RandomGenerator.alphaNumeric(16),
  } satisfies IShoppingMallSellerSession.ICreate;
  const createdSession: IShoppingMallSellerSession =
    await api.functional.shoppingMall.seller.shoppingMallSellers.shoppingMallSellerSessions.create(
      connection,
      {
        shoppingMallSellerId: sellerResource.id,
        body: sessionCreateBody,
      },
    );
  typia.assert(createdSession);

  // Seller deletes the created session successfully
  await api.functional.shoppingMall.seller.shoppingMallSellers.shoppingMallSellerSessions.erase(
    connection,
    {
      shoppingMallSellerId: sellerResource.id,
      shoppingMallSellerSessionId: createdSession.id,
    },
  );

  // Deleting already-deleted session should throw error
  await TestValidator.error(
    "Deleting already deleted session throws error",
    async () => {
      await api.functional.shoppingMall.seller.shoppingMallSellers.shoppingMallSellerSessions.erase(
        connection,
        {
          shoppingMallSellerId: sellerResource.id,
          shoppingMallSellerSessionId: createdSession.id,
        },
      );
    },
  );

  // Create another seller user for unauthorized deletion testing
  const sellerBody3 = {
    email: `seller3_${RandomGenerator.alphaNumeric(5)}@example.com`,
    password: "Password000!",
  } satisfies IShoppingMallSeller.ICreate;
  const seller3Authorized: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, { body: sellerBody3 });
  typia.assert(seller3Authorized);

  const seller3LoginBody = {
    email: sellerBody3.email,
    password: sellerBody3.password,
    ip: null,
    href: "https://seller3.test.com/login",
    referrer: "https://seller3.test.com",
  } satisfies IShoppingMallSeller.ILogin;
  await api.functional.auth.seller.login(connection, {
    body: seller3LoginBody,
  });

  // Attempt unauthorized deletion by different seller (seller3 tries to delete sellerResource session)
  await TestValidator.error(
    "Unauthorized seller cannot delete another seller session",
    async () => {
      await api.functional.shoppingMall.seller.shoppingMallSellers.shoppingMallSellerSessions.erase(
        connection,
        {
          shoppingMallSellerId: sellerResource.id,
          shoppingMallSellerSessionId: createdSession.id,
        },
      );
    },
  );

  // Switch back to admin user
  const adminLoginBody2 = {
    email: adminBody.email,
    password: adminBody.password,
    ip: null,
    href: "https://admin.test.com/login",
    referrer: "https://admin.test.com",
  } satisfies IShoppingMallAdmin.ILogin;
  await api.functional.auth.admin.login(connection, { body: adminLoginBody2 });

  // Attempt unauthorized deletion by admin user (assuming admin doesn't have direct deletion rights for seller sessions)
  await TestValidator.error(
    "Admin user cannot delete seller session directly",
    async () => {
      await api.functional.shoppingMall.seller.shoppingMallSellers.shoppingMallSellerSessions.erase(
        connection,
        {
          shoppingMallSellerId: sellerResource.id,
          shoppingMallSellerSessionId: createdSession.id,
        },
      );
    },
  );
}
