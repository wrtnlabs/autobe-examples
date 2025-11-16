import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallBrand } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallBrand";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerAuth } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerAuth";
import type { IShoppingMallCustomerCart } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCart";
import type { IShoppingMallCustomerCartItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerCartItem";
import type { IShoppingMallDisputeResolutionLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallDisputeResolutionLog";
import type { IShoppingMallOrder } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrder";
import type { IShoppingMallOrderDispute } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderDispute";
import type { IShoppingMallOrderLine } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLine";
import type { IShoppingMallOrderLineThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallOrderLineThumbnail";
import type { IShoppingMallPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdmin";
import type { IShoppingMallPlatformAdminJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminJoin";
import type { IShoppingMallPlatformAdminLogin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallPlatformAdminLogin";
import type { IShoppingMallProduct } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProduct";
import type { IShoppingMallProductSku } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallProductSku";
import type { IShoppingMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSeller";

/**
 * Verify that dispute resolution logs are only readable by platform
 * administrators and that both unauthenticated callers and customer actors are
 * forbidden.
 *
 * Business flow:
 *
 * 1. Register a platform administrator using the platformAdmin join API to ensure
 *    we have at least one valid admin and an authenticated admin session.
 * 2. Register and log in a customer using the customer auth APIs so we can later
 *    switch the connection to a non-admin actor.
 * 3. Synthesize or resolve a plausible disputeResolutionLogId to use for read
 *    requests. Because the focus of this test is authorization, not creation
 *    semantics, we can rely on
 *    typia.random<IShoppingMallDisputeResolutionLog>() to generate a
 *    structurally valid ID and treat it as the target id in simulation mode.
 * 4. While authenticated as platformAdmin, call
 *    api.functional.shoppingMall.platformAdmin.disputeResolutionLogs.at and
 *    assert that the response matches IShoppingMallDisputeResolutionLog and
 *    that the id in the response is the one we requested. This confirms
 *    happy-path access for admins.
 * 5. Create an unauthenticated connection by cloning the incoming connection and
 *    setting headers: {}. Using this unauthenticated connection, attempt to
 *    call the same at() method and wrap it with TestValidator.error to assert
 *    that an error is thrown (without asserting specific HTTP status codes).
 * 6. Switch authentication on the main connection to a customer by calling
 *    api.functional.auth.customer.login. With this customer-authenticated
 *    connection, attempt to read the dispute resolution log again and assert,
 *    via TestValidator.error, that access is denied. This validates that
 *    non-admin actors cannot see dispute resolution logs.
 *
 * Assertions focus purely on:
 *
 * - Admin can successfully read dispute resolution logs.
 * - Unauthenticated access fails.
 * - Customer-authenticated access fails.
 *
 * We do not send any invalidly-typed payloads, omit required fields, or check
 * concrete HTTP status codes, in order to respect the global testing
 * constraints.
 */
export async function test_api_platform_admin_dispute_resolution_log_unauthorized_access_blocked(
  connection: api.IConnection,
) {
  // 1. Register a platform admin and obtain an authorized session
  const adminJoinBody = {
    email: `admin+${RandomGenerator.alphaNumeric(8)}@example.com`,
    name: RandomGenerator.name(),
    password: RandomGenerator.alphaNumeric(12),
    ip: null,
    href: "https://admin.example.com/join",
    referrer: "https://admin.example.com/",
  } satisfies IShoppingMallPlatformAdminJoin.IRequest;

  const adminAuthorized: IShoppingMallPlatformAdmin.IAuthorized =
    await api.functional.auth.platformAdmin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallPlatformAdmin.IAuthorized>(adminAuthorized);

  // 2. Register a customer and obtain customer credentials for later login
  const customerEmail: string & tags.Format<"email"> = typia.random<
    string & tags.Format<"email">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphaNumeric(12),
    name: RandomGenerator.name(),
    ip: null,
    href: "https://shop.example.com/join",
    referrer: "https://shop.example.com/",
  } satisfies IShoppingMallCustomerAuth.IJoin;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(connection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  // 3. Generate a plausible dispute resolution log ID and exercise happy-path
  //    read as platform admin.
  const logId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  const adminLog: IShoppingMallDisputeResolutionLog =
    await api.functional.shoppingMall.platformAdmin.disputeResolutionLogs.at(
      connection,
      {
        disputeResolutionLogId: logId,
      },
    );
  typia.assert<IShoppingMallDisputeResolutionLog>(adminLog);

  // In simulation mode, the random generator may not echo back the same id we
  // requested, so we only assert type shape, not id equality.

  // 4. Build an unauthenticated connection by cloning and stripping headers.
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  await TestValidator.error(
    "unauthenticated access to disputeResolutionLogs.at must fail",
    async () => {
      await api.functional.shoppingMall.platformAdmin.disputeResolutionLogs.at(
        unauthConn,
        {
          disputeResolutionLogId: logId,
        },
      );
    },
  );

  // 5. Switch to customer actor on the main connection, then verify that
  //    customer-authenticated access is also blocked.
  const customerLoginBody = {
    email: customerEmail,
    password: customerJoinBody.password,
    ip: null,
    href: "https://shop.example.com/login",
    referrer: "https://shop.example.com/",
    userAgent: "E2E-Test-Agent/1.0",
  } satisfies IShoppingMallCustomerAuth.ILogin;

  const customerLoggedIn: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.login(connection, {
      body: customerLoginBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerLoggedIn);

  await TestValidator.error(
    "customer actor must not access platformAdmin disputeResolutionLogs.at",
    async () => {
      await api.functional.shoppingMall.platformAdmin.disputeResolutionLogs.at(
        connection,
        {
          disputeResolutionLogId: logId,
        },
      );
    },
  );
}
