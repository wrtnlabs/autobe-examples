import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallSecurityEvent";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallSecurityEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSecurityEvent";

export async function test_api_platform_admin_security_events_after_join_and_login(
  connection: api.IConnection,
) {
  /** 1. Join as a new platform administrator, capturing authorized session and ID. */
  const email: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();
  const password: string = RandomGenerator.alphaNumeric(16);

  const joinRequestBody = {
    email,
    name: RandomGenerator.name(),
    password,
    ip: "203.0.113.10",
    href: "https://admin.example.com/onboarding",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const joinedAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: joinRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(joinedAdmin);

  // Basic invariants on the authorized admin object
  TestValidator.predicate("platform admin is active", joinedAdmin.isActive);
  TestValidator.predicate(
    "platform admin has JWT token",
    joinedAdmin.token.access.length > 0 && joinedAdmin.token.refresh.length > 0,
  );

  const platformAdminId: string & tags.Format<"uuid"> = joinedAdmin.id;
  const joinCreatedAt: string & tags.Format<"date-time"> =
    joinedAdmin.createdAt;

  /**
   * 2. Perform an explicit login for the same platform admin to generate login
   *    events.
   */
  const loginRequestBody = {
    email,
    password,
    ip: "198.51.100.20",
    href: "https://admin.example.com/login",
    referrer: "https://admin.example.com/onboarding",
  } satisfies IShoppingMallPlatformAdminLogin.IRequest;

  const loggedInAdmin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.login(connection, {
      body: loginRequestBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(loggedInAdmin);

  TestValidator.equals(
    "login keeps same admin id",
    loggedInAdmin.id,
    joinedAdmin.id,
  );

  /**
   * 3. Prepare a time window that should include both join and login events. We
   *    rely on the fact that joinCreatedAt and loggedInAdmin.updatedAt
   *    represent timestamps around those actions.
   */
  const joinTime = new Date(joinCreatedAt).getTime();
  const loginTime = new Date(loggedInAdmin.updatedAt).getTime();

  const fromMs = joinTime - 5 * 60 * 1000;
  const toMs = loginTime + 5 * 60 * 1000;

  const fromTime = new Date(fromMs).toISOString();
  const toTime = new Date(toMs).toISOString();

  const searchRequestBody = {
    page: 1,
    limit: 20,
    actor_type: "platformAdmin",
    created_from: fromTime,
    created_to: toTime,
  } satisfies IShoppingMallSecurityEvent.IRequest;

  /** 4. Query security events for this platform admin. */
  const page: IPageIShoppingMallSecurityEvent.ISummary =
    await api.functional.shoppingMall.platformAdmin.platformAdmins.securityEvents.index(
      connection,
      {
        platformAdminId,
        body: searchRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallSecurityEvent.ISummary>(page);

  /** 5. Validate pagination metadata is consistent. */
  const pagination = page.pagination;
  TestValidator.predicate(
    "pagination.current is non-negative",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination.limit is positive", pagination.limit > 0);
  TestValidator.predicate(
    "pagination.records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination.pages is non-negative",
    pagination.pages >= 0,
  );
  TestValidator.predicate(
    "records is at least data length",
    pagination.records >= page.data.length,
  );

  /**
   * 6. Validate each event summary is within the requested window and scoped to
   *    platformAdmin.
   */
  for (const event of page.data) {
    typia.assert<IShoppingMallSecurityEvent.ISummary>(event);

    // occurredAt must be within [fromTime, toTime]
    const occurred = new Date(event.occurredAt).getTime();
    TestValidator.predicate(
      "event occurred within requested time window",
      occurred >= fromMs && occurred <= toMs,
    );

    // actor_type, when present, should be platformAdmin.
    if (event.actor_type !== undefined) {
      TestValidator.equals(
        "event actor_type is platformAdmin",
        event.actor_type,
        "platformAdmin",
      );
    }

    // event_type should be a non-empty string.
    TestValidator.predicate(
      "event_type is non-empty",
      event.event_type.length > 0,
    );
  }

  /**
   * 7. If there are any events, check that at least one looks like an auth-related
   *    event by name convention (contains 'LOGIN' or 'login'), without assuming
   *    concrete enum.
   */
  if (page.data.length > 0) {
    const hasLoginLikeEvent = page.data.some((event) =>
      event.event_type.toLowerCase().includes("login"),
    );

    TestValidator.predicate(
      "at least one event is login-related when events exist",
      hasLoginLikeEvent,
    );
  }
}
