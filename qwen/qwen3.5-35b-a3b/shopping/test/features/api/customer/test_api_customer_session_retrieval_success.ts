import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerProfile";
import type { IEcommerceMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomerSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_customer_session_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResult = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResult);
  // 2. Login with the created customer account
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_customer_login(loginConnection, {
    body: {
      email: joinResult.email,
      password: "1234",
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(loginResult);
  // 3. Retrieve session information
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  const sessionConnection: api.IConnection = { host: connection.host };
  sessionConnection.headers = { Authorization: loginResult.token.access };
  const sessionResponse =
    await api.functional.ecommerceMall.customer.sessions.at(sessionConnection, {
      sessionId,
    });
  typia.assert(sessionResponse);
  // 4. Validate all required fields are present (confirmed by typia.assert)
  TestValidator.equals(
    "session has valid id",
    sessionResponse.id !== undefined,
    true,
  );
  TestValidator.equals(
    "session has customer data",
    sessionResponse.customer !== undefined,
    true,
  );
  TestValidator.equals(
    "session has ip",
    sessionResponse.ip !== undefined,
    true,
  );
  TestValidator.equals(
    "session has href",
    sessionResponse.href !== undefined,
    true,
  );
  TestValidator.equals(
    "session has referrer",
    sessionResponse.referrer !== undefined,
    true,
  );
  TestValidator.equals(
    "session has created_at",
    sessionResponse.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "session has expired_at",
    sessionResponse.expired_at !== undefined,
    true,
  );
  // 5. Verify customer object reference contains summary data
  const customer = sessionResponse.customer;
  TestValidator.equals(
    "customer id is valid uuid",
    customer.id.length > 0,
    true,
  );
  TestValidator.equals(
    "customer email format is valid",
    customer.email.includes("@"),
    true,
  );
  TestValidator.equals(
    "customer isBanned is boolean",
    typeof customer.isBanned === "boolean",
    true,
  );
  TestValidator.equals(
    "customer createdAt exists",
    customer.createdAt.length > 0,
    true,
  );
  TestValidator.equals(
    "customer updatedAt exists",
    customer.updatedAt.length > 0,
    true,
  );
  TestValidator.equals(
    "customer deletedAt is null or date-time",
    customer.deletedAt === null || customer.deletedAt.length > 0,
    true,
  );
  TestValidator.equals(
    "customer profile exists",
    customer.customerProfile !== undefined,
    true,
  );
  TestValidator.equals(
    "profile displayName exists",
    customer.customerProfile.displayName.length > 0,
    true,
  );
  // 6. Validate timestamps are ISO 8601 formatted (confirmed by typia.assert)
  TestValidator.equals(
    "created_at parseable",
    !isNaN(Date.parse(sessionResponse.created_at)),
    true,
  );
  TestValidator.equals(
    "expired_at parseable",
    !isNaN(Date.parse(sessionResponse.expired_at)),
    true,
  );
  TestValidator.equals(
    "customer createdAt parseable",
    !isNaN(Date.parse(customer.createdAt)),
    true,
  );
  TestValidator.equals(
    "customer updatedAt parseable",
    !isNaN(Date.parse(customer.updatedAt)),
    true,
  );
  // 7. Validate expired_at is in the future (session is not expired)
  const now = new Date();
  const expiredAt = new Date(sessionResponse.expired_at);
  TestValidator.equals("session not expired", expiredAt > now, true);
  // 8. Verify session belongs to the authenticated customer
  TestValidator.equals(
    "session customer id matches login user id",
    customer.id,
    loginResult.id,
  );
  TestValidator.equals(
    "session customer email matches login user email",
    customer.email,
    loginResult.email,
  );
  // 9. Verify customer profile data
  TestValidator.equals(
    "profile has valid display name",
    customer.customerProfile.displayName.length > 0,
    true,
  );
  TestValidator.equals(
    "profile created_at is date-time",
    customer.customerProfile.createdAt.length > 0,
    true,
  );
  TestValidator.equals(
    "profile updated_at is date-time",
    customer.customerProfile.updatedAt.length > 0,
    true,
  );
}
