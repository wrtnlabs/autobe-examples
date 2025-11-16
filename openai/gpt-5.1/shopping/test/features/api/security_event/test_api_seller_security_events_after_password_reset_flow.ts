import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";
import type { IShoppingMallSellerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerJoin";
import type { IShoppingMallSellerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerLogin";
import type { IShoppingMallSellerPasswordResetComplete } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetComplete";
import type { IShoppingMallSellerPasswordResetRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordResetRequest";

/**
 * Validate seller-scoped security events after a full password reset flow.
 *
 * Business goal: Ensure that when a seller performs a password reset sequence
 * (request reset, complete reset, then log in with the new password), the
 * seller-focused security events endpoint exposes PASSWORD_RESET_REQUEST and
 * PASSWORD_RESET_SUCCESS events scoped to that seller and actor_type="seller"
 * only.
 *
 * Steps:
 *
 * 1. Register a new seller via /auth/seller/join to obtain sellerId and email.
 * 2. Trigger password reset request via /auth/seller/password/reset/request.
 * 3. Complete password reset via /auth/seller/password/reset/complete with a
 *    synthetic token and a new password.
 * 4. Log in with the new password via /auth/seller/login to verify credentials.
 * 5. Query seller security events via PATCH
 *    /shoppingMall/seller/sellers/{sellerId}/securityEvents using
 *    IShoppingMallSecurityEvent.IRequest filters.
 * 6. Assert that security events include PASSWORD_RESET_REQUEST and
 *    PASSWORD_RESET_SUCCESS for actor_type="seller" and that all actor_type
 *    values in the result, when present, are "seller".
 */
export async function test_api_seller_security_events_after_password_reset_flow(
  connection: api.IConnection,
) {
  // 1. Register a new seller
  const sellerJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: sellerJoinBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(joinedSeller);

  const sellerId = joinedSeller.id;
  const sellerEmail = joinedSeller.email;

  // 2. Request password reset for this seller
  const resetRequestBody = {
    email: sellerEmail,
  } satisfies IShoppingMallSellerPasswordResetRequest.IRequest;

  const resetRequestResponse: IShoppingMallSellerPasswordResetRequest.IResponse =
    await api.functional.auth.seller.password.reset.request.requestPasswordReset(
      connection,
      {
        body: resetRequestBody,
      },
    );
  typia.assert<IShoppingMallSellerPasswordResetRequest.IResponse>(
    resetRequestResponse,
  );

  TestValidator.predicate("password reset request acknowledged", () => {
    return resetRequestResponse.success === true;
  });

  // Capture time just after reset request for created_from window
  const windowStart = new Date();

  // 3. Complete password reset with a synthetic token and new password
  const newPassword = RandomGenerator.alphaNumeric(16);
  const resetCompleteBody = {
    token: RandomGenerator.alphaNumeric(32),
    password: newPassword,
  } satisfies IShoppingMallSellerPasswordResetComplete.IRequest;

  const resetCompleteResponse: IShoppingMallSellerPasswordResetComplete.IResponse =
    await api.functional.auth.seller.password.reset.complete.completePasswordReset(
      connection,
      {
        body: resetCompleteBody,
      },
    );
  typia.assert<IShoppingMallSellerPasswordResetComplete.IResponse>(
    resetCompleteResponse,
  );

  TestValidator.predicate("password reset complete acknowledged", () => {
    return resetCompleteResponse.success === true;
  });

  // 4. Login with the new password to verify credential change
  const loginBody = {
    email: sellerEmail,
    password: newPassword,
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallSellerLogin.IRequest;

  const loggedInSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginBody,
    });
  typia.assert<IShoppingMallSeller.IAuthorized>(loggedInSeller);

  TestValidator.equals(
    "seller id should remain the same after login",
    loggedInSeller.id,
    sellerId,
  );

  // Capture end of time window
  const windowEnd = new Date();

  // 5. Query seller security events within the time window
  const createdFrom = windowStart.toISOString();
  const createdTo = windowEnd.toISOString();

  const securityRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    actor_type: "seller",
    created_from: createdFrom,
    created_to: createdTo,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const pageResult: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.seller.sellers.securityEvents.index(
      connection,
      {
        sellerId,
        body: securityRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(pageResult);

  // 6. Basic pagination sanity checks
  TestValidator.predicate("pagination current page is non-negative", () => {
    return pageResult.pagination.current >= 0;
  });

  TestValidator.predicate("pagination limit is non-negative", () => {
    return pageResult.pagination.limit >= 0;
  });

  TestValidator.predicate("records count is non-negative", () => {
    return pageResult.pagination.records >= 0;
  });

  TestValidator.predicate("pages count is non-negative", () => {
    return pageResult.pagination.pages >= 0;
  });

  TestValidator.predicate("data length does not exceed limit", () => {
    return pageResult.data.length <= pageResult.pagination.limit;
  });

  // 7. Validate presence of password reset related events for this seller
  const events = pageResult.data;

  const hasPasswordResetRequest = events.some((event) => {
    return event.event_type === "PASSWORD_RESET_REQUEST";
  });

  const hasPasswordResetSuccess = events.some((event) => {
    return event.event_type === "PASSWORD_RESET_SUCCESS";
  });

  TestValidator.predicate(
    "security events include PASSWORD_RESET_REQUEST for seller",
    hasPasswordResetRequest,
  );

  TestValidator.predicate(
    "security events include PASSWORD_RESET_SUCCESS for seller",
    hasPasswordResetSuccess,
  );

  // Ensure all events, when actor_type is present, are scoped to seller
  TestValidator.predicate(
    "all security events for this endpoint have actor_type seller when defined",
    () =>
      events.every(
        (event) =>
          event.actor_type === undefined || event.actor_type === "seller",
      ),
  );
}
