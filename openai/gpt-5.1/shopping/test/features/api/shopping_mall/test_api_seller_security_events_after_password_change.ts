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
import type { IShoppingMallSellerPasswordChange } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSellerPasswordChange";

export async function test_api_seller_security_events_after_password_change(
  connection: api.IConnection,
) {
  // 1. Register a new seller via join to obtain sellerId and initial auth token
  const joinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const joinedSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: joinRequestBody,
    });
  typia.assert(joinedSeller);

  const sellerId = joinedSeller.id;

  // 2. Change password using the known current password
  const newPassword = RandomGenerator.alphaNumeric(14);
  const passwordChangeBody = {
    currentPassword: joinRequestBody.password,
    newPassword,
  } satisfies IShoppingMallSellerPasswordChange.IRequest;

  const passwordChangeResult: IShoppingMallSellerPasswordChange.IResponse =
    await api.functional.auth.seller.password.change.changePassword(
      connection,
      {
        body: passwordChangeBody,
      },
    );
  typia.assert(passwordChangeResult);

  TestValidator.predicate(
    "seller password change should succeed",
    passwordChangeResult.success === true,
  );

  // 3. Re-login with new password to confirm change and keep auth fresh
  const loginRequestBody = {
    email: joinRequestBody.email,
    password: newPassword,
    ip: null,
    href: "https://seller.example.com/login",
    referrer: "https://seller.example.com/",
  } satisfies IShoppingMallSellerLogin.IRequest;

  const reloginSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.login(connection, {
      body: loginRequestBody,
    });
  typia.assert(reloginSeller);

  TestValidator.equals(
    "re-login should authenticate the same seller id",
    reloginSeller.id,
    sellerId,
  );

  // 4. Query security events for this seller in a recent time window
  const now = new Date();
  const windowFrom = new Date(now.getTime() - 5 * 60 * 1000).toISOString();
  const windowTo = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const securityEventsRequest = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    actor_type: "seller",
    created_from: windowFrom as string & tags.Format<"date-time">,
    created_to: windowTo as string & tags.Format<"date-time">,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  const sellerEventsPage: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.seller.sellers.securityEvents.index(
      connection,
      {
        sellerId,
        body: securityEventsRequest,
      },
    );
  typia.assert(sellerEventsPage);

  const events = sellerEventsPage.data;

  // Basic pagination sanity checks
  TestValidator.predicate(
    "pagination.current should be within valid range",
    sellerEventsPage.pagination.current >= 0 &&
      sellerEventsPage.pagination.current <
        sellerEventsPage.pagination.pages +
          (sellerEventsPage.pagination.pages === 0 ? 1 : 0),
  );

  TestValidator.predicate(
    "pagination.records should match or exceed returned data length",
    sellerEventsPage.pagination.records >= events.length,
  );

  // 5. Assert at least one event is password-change related for this seller, if any events exist
  const passwordEvents: IShoppingMallSecurityEvent.ISummary[] = events.filter(
    (event) =>
      event.actor_type === "seller" &&
      event.event_type.toUpperCase().includes("PASSWORD"),
  );

  TestValidator.predicate(
    "there should be at least one password-related security event for the seller after password change",
    passwordEvents.length > 0,
  );

  // Ensure all events in this seller-scoped query are for seller actor_type when actor_type filter is applied
  const nonSellerActorEvents = events.filter(
    (event) => event.actor_type !== undefined && event.actor_type !== "seller",
  );

  TestValidator.equals(
    "all returned security events should have actor_type 'seller' when filtered by actor_type",
    nonSellerActorEvents.length,
    0,
  );

  // 6. Optional: register another seller and confirm their security events do not include first seller's events
  const secondJoinRequestBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12),
    storeName: RandomGenerator.name(2),
    contactPhone: RandomGenerator.mobile(),
  } satisfies IShoppingMallSellerJoin.IRequest;

  const secondSeller: IShoppingMallSeller.IAuthorized =
    await api.functional.auth.seller.join(connection, {
      body: secondJoinRequestBody,
    });
  typia.assert(secondSeller);

  const secondSellerEventsPage: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.seller.sellers.securityEvents.index(
      connection,
      {
        sellerId: secondSeller.id,
        body: securityEventsRequest,
      },
    );
  typia.assert(secondSellerEventsPage);

  const secondSellerEvents = secondSellerEventsPage.data;

  const overlappingEvents = secondSellerEvents.filter((secondEvent) =>
    events.some((firstEvent) => firstEvent.id === secondEvent.id),
  );

  TestValidator.equals(
    "security events for two different sellers should not share the same event IDs within the scoped query",
    overlappingEvents.length,
    0,
  );
}
