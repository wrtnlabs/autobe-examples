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
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";

export async function test_api_customer_join_persists_registration_metadata_for_security_analytics(
  connection: api.IConnection,
) {
  // 1. Bootstrap admin account (admin join) to later query customer sessions
  const adminEmail: string = typia.random<string & tags.Format<"email">>();
  const adminJoinBody = {
    email: adminEmail,
    password: RandomGenerator.alphabets(12) as string & tags.Format<"password">,
    ip: typia.random<string & tags.Format<"ipv4">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IShoppingMallAdminJoin.ICreate;

  const adminAuthorized: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminAuthorized);

  // 2. Prepare a separate customer-facing connection without admin Authorization header
  const customerConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // 3. Execute customer join with explicit contextual metadata
  const joinRequestedAt: Date = new Date();

  const customerEmail: string = typia.random<string & tags.Format<"email">>();
  const explicitIp: string & (tags.Format<"ipv4"> | tags.Format<"ipv6">) =
    typia.random<string & tags.Format<"ipv4">>();
  const href: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const referrer: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();

  const customerJoinBody = {
    email: customerEmail,
    password: RandomGenerator.alphabets(16) as string & tags.Format<"password">,
    ip: explicitIp,
    href,
    referrer,
  } satisfies IShoppingMallCustomerJoin.IRequest;

  const customerAuthorized: IShoppingMallCustomer.IAuthorized =
    await api.functional.auth.customer.join(customerConnection, {
      body: customerJoinBody,
    });
  typia.assert<IShoppingMallCustomer.IAuthorized>(customerAuthorized);

  const customerId = customerAuthorized.id;

  // 4. Re-establish admin authentication for admin-only endpoints
  const adminRejoin: IShoppingMallAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert<IShoppingMallAdmin.IAuthorized>(adminRejoin);

  // 5. Query customer sessions as admin, filtering by customerId and IP
  const now: Date = new Date();
  const createdAtFrom = new Date(
    joinRequestedAt.getTime() - 5 * 60 * 1000,
  ).toISOString();
  const createdAtTo = new Date(now.getTime() + 5 * 60 * 1000).toISOString();

  const sessionRequestBody = {
    page: 1 as number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 50 as number & tags.Type<"int32"> & tags.Minimum<1>,
    createdAtFrom,
    createdAtTo,
    lastSeenFrom: null,
    lastSeenTo: null,
    ipAddress: explicitIp,
    userAgent: null,
    channel: null,
    status: null,
  } satisfies IShoppingMallCustomerSession.IRequest;

  const sessionsPage: IPageIShoppingMallCustomerSession.ISummary =
    await api.functional.shoppingMall.admin.customers.sessions.index(
      connection,
      {
        customerId: customerId,
        body: sessionRequestBody,
      },
    );
  typia.assert<IPageIShoppingMallCustomerSession.ISummary>(sessionsPage);

  // Basic sanity check: at least one session returned
  TestValidator.predicate(
    "at least one customer session should exist after join",
    sessionsPage.data.length > 0,
  );

  // Find the most recent session for this customer (in case multiple sessions were created)
  const customerSessions = sessionsPage.data.filter(
    (session) => session.customer.id === customerId,
  );

  TestValidator.predicate(
    "filtered sessions for joined customer should not be empty",
    customerSessions.length > 0,
  );

  const latestSession = customerSessions.reduce((latest, current) => {
    const latestTime = new Date(latest.created_at).getTime();
    const currentTime = new Date(current.created_at).getTime();
    return currentTime > latestTime ? current : latest;
  }, customerSessions[0]);

  // 6. Validate that session metadata matches join request
  TestValidator.equals(
    "session href should match join href",
    latestSession.href,
    href,
  );

  TestValidator.equals(
    "session referrer should match join referrer",
    latestSession.referrer,
    referrer,
  );

  TestValidator.equals(
    "session IP should match explicit join IP when provided",
    latestSession.ip,
    explicitIp,
  );

  TestValidator.equals(
    "session customer id should match joined customer id",
    latestSession.customer.id,
    customerId,
  );

  // 7. Validate created_at and expired_at temporal logic
  const sessionCreatedAtMs = new Date(latestSession.created_at).getTime();
  const joinRequestedAtMs = joinRequestedAt.getTime();
  const nowMs = now.getTime();

  TestValidator.predicate(
    "session created_at should not be earlier than join request start minus tolerance",
    sessionCreatedAtMs >= joinRequestedAtMs - 5 * 60 * 1000,
  );

  TestValidator.predicate(
    "session created_at should not be later than now plus tolerance",
    sessionCreatedAtMs <= nowMs + 5 * 60 * 1000,
  );

  if (
    latestSession.expired_at !== null &&
    latestSession.expired_at !== undefined
  ) {
    const expiredAtMs = new Date(latestSession.expired_at).getTime();
    TestValidator.predicate(
      "session expired_at should not be earlier than created_at when present",
      expiredAtMs >= sessionCreatedAtMs,
    );
  }
}
