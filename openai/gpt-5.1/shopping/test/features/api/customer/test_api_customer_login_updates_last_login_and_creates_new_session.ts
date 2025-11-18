import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdminJoin";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerJoin";
import type { IShoppingMallCustomerLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerLogin";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

export async function test_api_customer_login_updates_last_login_and_creates_new_session(
  connection: api.IConnection,
) {
  // 1. Bootstrap an admin account to use admin-only inspection endpoints.
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    href: "https://admin.example.com/join" as string & tags.Format<"uri">,
    referrer: "https://admin.example.com/landing" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Register a new customer via POST /auth/customer/join.
  const customerEmail = typia.random<string & tags.Format<"email">>();
  const customerPassword = RandomGenerator.alphabets(12) as string &
    tags.Format<"password">;

  const firstHref = "https://shop.example.com/signup" as string &
    tags.Format<"uri">;
  const firstReferrer = "https://campaign.example.com" as string &
    tags.Format<"uri">;

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    // ip is optional and nullable; let server derive for the first session.
    ip: null,
    href: firstHref,
    referrer: firstReferrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const firstAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(firstAuthorized);

  const customerId = firstAuthorized.id;

  // Switch back to admin context because customer.join has set the customer token.
  const adminRejoinBeforeBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    href: "https://admin.example.com/rejoin-before" as string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminBeforeAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRejoinBeforeBody,
    });
  typia.assert(adminBeforeAgain);

  // 3. Capture current last_login_at and session count via admin endpoints.
  const adminCustomerBefore: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId,
    });
  typia.assert(adminCustomerBefore);

  const lastLoginBefore = adminCustomerBefore.last_login_at ?? null;

  const sessionsBeforePage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
          createdAtFrom: null,
          createdAtTo: null,
          lastSeenFrom: null,
          lastSeenTo: null,
          ipAddress: null,
          userAgent: null,
          channel: null,
          status: null,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsBeforePage);

  const beforeSessions = sessionsBeforePage.data;
  const beforeCount = beforeSessions.length;

  // 4. Perform another POST /auth/customer/login with same credentials.
  const secondHref = "https://shop.example.com/login" as string &
    tags.Format<"uri">;
  const secondReferrer = "https://shop.example.com/cart" as string &
    tags.Format<"uri">;

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    // Provide concrete IP for the second session to assert against.
    ip: "203.0.113.10",
    href: secondHref,
    referrer: secondReferrer,
  } satisfies IShoppingMallCustomerLogin.IRequest;

  const secondAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert(secondAuthorized);

  // 5. Restore admin context again because customer.login overwrote the token.
  const adminRejoinAfterBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    href: "https://admin.example.com/rejoin-after" as string &
      tags.Format<"uri">,
    referrer: "https://admin.example.com/dashboard" as string &
      tags.Format<"uri">,
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAfterAgain: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminRejoinAfterBody,
    });
  typia.assert(adminAfterAgain);

  // 6. Verify that last_login_at has advanced or at least is set.
  const adminCustomerAfter: IShoppingMallCustomer =
    await api.functional.shoppingMall.admin.customers.at(connection, {
      customerId,
    });
  typia.assert(adminCustomerAfter);

  const lastLoginAfter = adminCustomerAfter.last_login_at ?? null;

  TestValidator.predicate(
    "last_login_at should be set after second login",
    () => lastLoginAfter !== null,
  );

  if (lastLoginBefore !== null && lastLoginAfter !== null) {
    TestValidator.predicate(
      "last_login_at should be updated to a later or equal timestamp",
      () => lastLoginAfter >= lastLoginBefore,
    );
  }

  // 7. Verify sessions list has increased and contains new session details.
  const sessionsAfterPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId,
        body: {
          page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
          limit: 100 as number & tags.Type<"int32"> & tags.Minimum<1>,
          createdAtFrom: null,
          createdAtTo: null,
          lastSeenFrom: null,
          lastSeenTo: null,
          ipAddress: null,
          userAgent: null,
          channel: null,
          status: null,
        } satisfies IShoppingMallCustomerSession.IRequest,
      },
    );
  typia.assert(sessionsAfterPage);

  const afterSessions = sessionsAfterPage.data;
  const afterCount = afterSessions.length;

  TestValidator.predicate(
    "session count should increase by at least one after login",
    () => afterCount >= beforeCount + 1,
  );

  // Find a session matching second login’s href/referrer/ip.
  const newSession = afterSessions.find((session) => {
    return (
      session.href === secondHref &&
      session.referrer === secondReferrer &&
      session.ip === customerLoginBody.ip
    );
  });

  TestValidator.predicate(
    "a new session matching second login metadata should exist",
    () => newSession !== undefined,
  );

  if (newSession !== undefined && lastLoginAfter !== null) {
    TestValidator.predicate(
      "new session created_at should be on or after last_login_at",
      () => newSession.created_at >= lastLoginAfter,
    );
  }

  // Ensure previous sessions remain (retention: no deletion of earlier sessions).
  TestValidator.predicate(
    "previous sessions should still be present (retention check)",
    () =>
      beforeSessions.every((before) =>
        afterSessions.some((after) => after.id === before.id),
      ),
  );
}
