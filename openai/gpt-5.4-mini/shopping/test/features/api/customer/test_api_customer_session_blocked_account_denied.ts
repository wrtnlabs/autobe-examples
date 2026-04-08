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

export async function test_api_customer_session_blocked_account_denied(
  connection: api.IConnection,
): Promise<void> {
  const joinConnection: api.IConnection = { host: connection.host };
  const email = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const href = "https://example.com/register";
  const referrer = "https://example.com/landing";
  const joined = await authorize_customer_join(joinConnection, {
    body: {
      email,
      password,
      href,
      referrer,
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(joined);
  const sessionConnection: api.IConnection = { host: connection.host };
  const session = await generate_random_mall_platform_customer_sessions_create(
    sessionConnection,
    {
      body: {
        email,
        password,
        href: "https://example.com/login",
        referrer: "https://example.com/account",
      } satisfies IMallPlatformCustomerSession.ICreate,
    },
  );
  typia.assert(session);
  TestValidator.equals("session customer email", session.customer.email, email);
}
