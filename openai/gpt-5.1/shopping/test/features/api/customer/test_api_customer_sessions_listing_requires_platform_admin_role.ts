import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallCustomerSession";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";

export async function test_api_customer_sessions_listing_requires_platform_admin_role(
  connection: api.IConnection,
) {
  // 1. Prepare deterministic customer credentials and registration payload
  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const customerPassword: string = RandomGenerator.alphaNumeric(12);

  const customerJoinBody = {
    email: customerEmail,
    password: customerPassword,
    name: RandomGenerator.name(),
    ip: null,
    href: "https://customer.example.com/join",
    referrer: "https://customer.example.com/landing",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  // 1-1. Join as customer (this also sets Authorization header on `connection`)
  const customerAuthorizedOnJoin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert(customerAuthorizedOnJoin);

  const customerId: string & tags.Format<"uuid"> = customerAuthorizedOnJoin.id;

  // 2. Perform a separate login to ensure at least one additional session row exists.
  //    Use a fresh unauthenticated connection so SDK can attach the new token there
  //    without interfering with our main `connection` used for role switching.
  const loginConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  const customerLoginBody = {
    email: customerEmail,
    password: customerPassword,
    ip: null,
    href: "https://customer.example.com/login",
    referrer: "https://customer.example.com/landing",
    userAgent: "E2E-Customer-Agent",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerAuthorizedOnLogin: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(loginConnection, {
      body: customerLoginBody,
    });
  typia.assert(customerAuthorizedOnLogin);

  // Common request body for sessions listing
  const sessionsRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 as number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<200>,
    sortBy: "created_at",
    sortDirection: "desc",
  } satisfies IShoppingMallCustomerSession.IRequest;

  // 3. Unauthenticated context: no Authorization header at all
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  await TestValidator.httpError(
    "unauthenticated user cannot list customer sessions",
    [401, 403],
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.sessions.index(
        unauthConnection,
        {
          customerId,
          body: sessionsRequestBody,
        },
      );
    },
  );

  // 4. Authenticated customer context: use loginConnection which now has customer JWT
  await TestValidator.httpError(
    "customer actor cannot access platformAdmin customer sessions endpoint",
    [403, 401],
    async () => {
      await api.functional.shoppingMall.platformAdmin.customers.sessions.index(
        loginConnection,
        {
          customerId,
          body: sessionsRequestBody,
        },
      );
    },
  );

  // 5. Register a platform admin and get an authorized admin connection via join
  const platformAdminEmail: string = typia.random<
    string & tags.Format<"email">
  >();
  const platformAdminPassword: string = RandomGenerator.alphaNumeric(16);

  const platformAdminJoinBody = {
    email: platformAdminEmail,
    name: RandomGenerator.name(),
    password: platformAdminPassword,
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/landing",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const platformAdminAuthorizedOnJoin: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: platformAdminJoinBody,
    });
  typia.assert(platformAdminAuthorizedOnJoin);

  // 6. As platformAdmin (token stored in `connection`), list the sessions
  const page: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.platformAdmin.customers.sessions.index(
      connection,
      {
        customerId,
        body: sessionsRequestBody,
      },
    );
  typia.assert(page);

  // Basic pagination invariants
  TestValidator.predicate(
    "pagination current page index must be >= 0",
    page.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination limit must be >= 0",
    page.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination records must be >= 0",
    page.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages must be >= 0",
    page.pagination.pages >= 0,
  );

  // Data length should not exceed the page size limit
  TestValidator.predicate(
    "data length must be less than or equal to pagination limit",
    page.data.length <= page.pagination.limit,
  );

  // If there are any session rows, rely on typia.assert for each row to ensure type shape
  await ArrayUtil.asyncForEach(page.data, async (session) => {
    typia.assert<IShoppingMallCustomerSession.ISummary>(session);
  });
}
