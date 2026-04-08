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

export async function test_api_customer_session_lookup_owned_record(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuthorized = await authorize_customer_join(ownerConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup/customer",
      referrer: "https://example.com/landing",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(ownerAuthorized);
  await TestValidator.httpError(
    "customer session lookup without a session id source should be inaccessible",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.sessions.at(ownerConnection, {
        sessionId: ownerAuthorized.id,
      });
    },
  );
  const otherConnection: api.IConnection = { host: connection.host };
  const otherAuthorized = await authorize_customer_join(otherConnection, {
    body: {
      email: `${RandomGenerator.alphaNumeric(8)}@test.com`,
      password: typia.random<string & tags.Format<"password">>(),
      href: "https://example.com/signup/other",
      referrer: "https://example.com/referrer",
      ip: "127.0.0.1",
    } satisfies IMallPlatformCustomer.IJoin,
  });
  typia.assert(otherAuthorized);
  await TestValidator.httpError(
    "another customer's session should not be exposed",
    [401, 403, 404],
    async () => {
      await api.functional.mallPlatform.customer.sessions.at(ownerConnection, {
        sessionId: otherAuthorized.id,
      });
    },
  );
}
