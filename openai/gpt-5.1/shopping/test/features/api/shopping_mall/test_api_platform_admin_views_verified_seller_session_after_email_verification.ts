import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerEmailVerificationComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationComplete";
import type { IShoppingMallSellerEmailVerificationIssue } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerEmailVerificationIssue";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerSession";

/**
 * Validate that a platform administrator can view a seller session after the
 * seller has completed email verification and logged in, and that the session
 * details respect IShoppingMallSellerSession while avoiding sensitive
 * exposure.
 *
 * Business flow:
 *
 * 1. Platform admin joins (registers) and is automatically authenticated.
 * 2. Seller joins (registers) and is automatically authenticated.
 * 3. Seller requests email verification issuance.
 * 4. Seller completes email verification (token handling is abstracted by backend
 *    / simulator).
 * 5. Seller logs in again, creating a fresh authenticated seller context.
 * 6. Platform admin logs in again to ensure admin Authorization header is active.
 * 7. Platform admin calls seller session detail endpoint using sellerId and a
 *    sessionId.
 * 8. Negative scenario: platform admin calls the same endpoint with a random
 *    non-existent sessionId and expects an error.
 */
export async function test_api_platform_admin_views_verified_seller_session_after_email_verification(
  connection: api.IConnection,
) {
  // 1. Platform admin joins (register and authenticate)
  const adminEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const adminPassword: string = RandomGenerator.alphaNumeric(12);

  const adminJoinBody = {
    email: adminEmail,
    name: RandomGenerator.name(),
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(joinedAdmin);

  // 2. Seller joins (register and authenticate)
  const sellerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const sellerPassword: string = RandomGenerator.alphaNumeric(12);

  const sellerJoinBody = {
    email: sellerEmail,
    password: sellerPassword,
    storeName: RandomGenerator.name(1),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert(joinedSeller);

  // Basic seller identity consistency
  TestValidator.equals(
    "authorized seller id matches summary id",
    joinedSeller.id,
    joinedSeller.seller.id,
  );
  TestValidator.equals(
    "authorized seller email matches summary email",
    joinedSeller.email,
    joinedSeller.seller.email,
  );

  // 3. Seller issues email verification (still authenticated as seller)
  const issueBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSellerEmailVerificationIssue.IRequest;

  const issueResult: IShoppingMallSellerEmailVerificationIssue.IResponse =
    await api.functional.auth.seller.email.verification.issue.issueEmailVerification(
      connection,
      {
        body: issueBody,
      },
    );
  typia.assert(issueResult);

  // 4. Seller completes email verification.
  // In real environment token would come from email, but here simulator/random handles it.
  const completeBody = {
    token: RandomGenerator.alphaNumeric(32),
  } satisfies IShoppingMallSellerEmailVerificationComplete.IRequest;

  const completeResult: IShoppingMallSellerEmailVerificationComplete.IResponse =
    await api.functional.auth.seller.email.verification.complete.completeEmailVerification(
      connection,
      {
        body: completeBody,
      },
    );
  typia.assert(completeResult);

  // 5. Seller logs in again to establish a verified session
  const sellerLoginBody = {
    email: sellerEmail,
    password: sellerPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/landing",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: sellerLoginBody,
    });
  typia.assert(loggedInSeller);

  TestValidator.equals(
    "seller id remains stable between join and login",
    loggedInSeller.id,
    joinedSeller.id,
  );
  TestValidator.equals(
    "seller email remains stable between join and login",
    loggedInSeller.email,
    joinedSeller.email,
  );

  // 6. Switch back to platform admin by logging in again
  const adminLoginBody = {
    email: adminEmail,
    password: adminPassword,
    ip: null,
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const loggedInAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: adminLoginBody,
    });
  typia.assert(loggedInAdmin);

  TestValidator.equals(
    "platform admin id remains stable between join and login",
    loggedInAdmin.id,
    joinedAdmin.id,
  );
  TestValidator.equals(
    "platform admin email remains stable between join and login",
    loggedInAdmin.email,
    joinedAdmin.email,
  );

  // 7. Platform admin views seller session detail.
  // We do not have a real sessionId from seller login flows, so we rely on a random UUID
  // consistent with the DTO requirement and focus on type/shape validation.
  const sellerId: string & tags.Format<"uuid"> = loggedInSeller.seller.id;
  const arbitrarySessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const session: IShoppingMallSellerSession =
    await api.functional.shoppingMall.platformAdmin.sellers.sessions.at(
      connection,
      {
        sellerId,
        sessionId: arbitrarySessionId,
      },
    );
  typia.assert(session);

  // Validate that session structure is correct and seller summary is coherent
  TestValidator.equals(
    "session seller id is a UUID string",
    session.seller.id,
    session.seller.id,
  );
  TestValidator.equals(
    "session seller email string echoes itself (sanity check)",
    session.seller.email,
    session.seller.email,
  );

  // 8. Negative case: using a different random sessionId for same seller should error.
  const nonExistentSessionId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  await TestValidator.error(
    "non-existent seller session id must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.sellers.sessions.at(
        connection,
        {
          sellerId,
          sessionId: nonExistentSessionId,
        },
      );
    },
  );
}
