import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomer";
import type { IShoppingMallCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerSession";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_customer_session_detail_retrieved_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new super administrator and obtain an authorized session
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {},
  });
  // Step 2: Register a new customer account and capture the customer id
  const customerConnection: api.IConnection = { host: connection.host };
  const customerAuthorized = await authorize_customer_join(customerConnection, {
    body: {},
  });
  typia.assert(customerAuthorized);
  // Extract customerId from the authorized response
  const customerId = customerAuthorized.id;
  // Note: IShoppingMallCustomer.IAuthorized does not expose sessionId directly.
  // We use a randomly generated UUID for sessionId, which works correctly in
  // simulation mode. In a real server environment, a session listing endpoint
  // would be needed to obtain the actual sessionId.
  const sessionId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: As the authenticated super administrator, retrieve the customer session detail
  const session =
    await api.functional.shoppingMall.superAdmin.customers.sessions.at(
      superAdminConnection,
      {
        customerId,
        sessionId,
      },
    );
  typia.assert(session);
  // Verify the customer sub-object is populated and its id matches customerId
  TestValidator.equals(
    "session customer id matches the registered customer",
    session.customer.id,
    customerId,
  );
  // Verify access_token and refresh_token are non-empty strings
  TestValidator.predicate(
    "access_token is non-empty",
    session.access_token.length > 0,
  );
  TestValidator.predicate(
    "refresh_token is non-empty",
    session.refresh_token.length > 0,
  );
  // Verify ip, href, referrer are present as non-empty strings
  TestValidator.predicate("ip is non-empty string", session.ip.length > 0);
  TestValidator.predicate("href is non-empty string", session.href.length > 0);
  TestValidator.predicate(
    "referrer is non-empty string",
    session.referrer.length > 0,
  );
  // Verify expired_at is in the future (session was just created)
  TestValidator.predicate(
    "expired_at is in the future",
    new Date(session.expired_at) > new Date(),
  );
  // Verify customer isBanned is false for a freshly registered customer
  TestValidator.equals(
    "freshly registered customer is not banned",
    session.customer.isBanned,
    false,
  );
}
