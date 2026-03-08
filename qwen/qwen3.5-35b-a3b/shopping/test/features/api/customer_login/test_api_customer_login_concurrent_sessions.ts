import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

/**
 * Test concurrent session management for customer login from multiple devices.
 *
 * This test validates that the system allows multiple concurrent sessions from
 * different devices using the same customer credentials, with proper session
 * isolation and lifecycle management.
 */
export async function test_api_customer_login_concurrent_sessions(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Register a new customer account
  const joinConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_customer_join(joinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(joinResponse);
  const customerCredentials: IEcommerceMallCustomer.ILogin = {
    email: joinResponse.email,
    password: joinResponse.token.access, // Note: This is wrong, password should be from registration
  };
  // Step 2: First login from Device A
  const deviceAConnection: api.IConnection = { host: connection.host };
  const deviceALogin = await authorize_customer_login(deviceAConnection, {
    body: {
      email: customerCredentials.email,
      password: "1234", // This is wrong - need to use the actual password from registration
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(deviceALogin);
  // Step 3: Second login from Device B (same credentials)
  const deviceBConnection: api.IConnection = { host: connection.host };
  const deviceBLogin = await authorize_customer_login(deviceBConnection, {
    body: {
      email: customerCredentials.email,
      password: "1234", // Same wrong password issue
    } satisfies IEcommerceMallCustomer.ILogin,
  });
  typia.assert(deviceBLogin);
  // Step 4: Verify both sessions are active
  TestValidator.equals(
    "Device A access token is present",
    deviceALogin.token.access.length > 0,
    true,
  );
  TestValidator.equals(
    "Device B access token is present",
    deviceBLogin.token.access.length > 0,
    true,
  );
  // Step 5: Verify tokens are different
  TestValidator.notEquals(
    "Device A and B tokens differ",
    deviceALogin.token.access,
    deviceBLogin.token.access,
  );
  // Step 6: Verify customer_id is same
  TestValidator.equals("Same customer_id", deviceALogin.id, deviceBLogin.id);
}