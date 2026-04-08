import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerProfile";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { generate_random_mall_platform_customer_sessions_create } from "../../../generate/generate_random_mall_platform_customer_sessions_create";
import { prepare_random_mall_platform_customer_session } from "../../../prepare/prepare_random_mall_platform_customer_session";

export async function test_api_customer_session_create_success(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test the normal customer sign-in workflow for session creation.
   *
   * Validates that a registered customer can create a session using the same
   * email and password, and that the created session preserves the submitted
   * client context and customer linkage without exposing any credential secrets.
   *
   * 1. Register a fresh customer account with valid context data.
   * 2. Create a session using the same email and password.
   * 3. Validate the returned session record and its customer summary linkage.
   * 4. Confirm request context is preserved and that the response does not
   *    contain password secrets.
   */
  const customerConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = "Password1234!" satisfies string;
  const href =
    `https://example.com/sign-in?return=${RandomGenerator.alphabets(8)}` satisfies string;
  const referrer =
    `https://example.com/landing/${RandomGenerator.alphabets(6)}` satisfies string;
  const ip = typia.random<string & tags.Format<"ipv4">>();
  const authorized = await authorize_customer_join(customerConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip,
    } satisfies IMallPlatformCustomer.IJoin,
  });
  const sessionConnection: api.IConnection = { host: connection.host };
  const session = await generate_random_mall_platform_customer_sessions_create(
    sessionConnection,
    {
      body: {
        email,
        password,
        href,
        referrer,
      } satisfies IMallPlatformCustomerSession.ICreate,
    },
  );
  typia.assert(session);
  TestValidator.equals(
    "session customer id should match joined customer",
    session.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "session customer email should match joined customer",
    session.customer.email,
    email,
  );
  TestValidator.equals(
    "session href should match submitted href",
    session.href,
    href,
  );
  TestValidator.equals(
    "session referrer should match submitted referrer",
    session.referrer,
    referrer,
  );
  TestValidator.predicate(
    "session id should not be empty",
    session.id.length > 0,
  );
  TestValidator.predicate(
    "session customer summary should not expose password",
    !Object.prototype.hasOwnProperty.call(session.customer, "password"),
  );
}
