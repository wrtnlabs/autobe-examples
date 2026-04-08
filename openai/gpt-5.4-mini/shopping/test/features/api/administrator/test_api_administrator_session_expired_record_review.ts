import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IMallPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformAdministrator";
import type { IMallPlatformCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomer";
import type { IMallPlatformCustomerSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IMallPlatformCustomerSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_administrator_session_expired_record_review(
  connection: api.IConnection,
): Promise<void> {
  const administratorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_administrator_join(
    administratorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(12),
      } satisfies IMallPlatformAdministrator.IJoin,
    },
  );
  typia.assert(authorized);
  const session = await api.functional.mallPlatform.administrator.sessions.at(
    administratorConnection,
    {
      sessionId: authorized.id,
    },
  );
  typia.assert(session);
  TestValidator.equals("session id preserved", session.id, authorized.id);
  TestValidator.equals(
    "owner id preserved",
    session.customer.id,
    authorized.id,
  );
  TestValidator.equals(
    "owner email preserved",
    session.customer.email,
    authorized.email,
  );
  TestValidator.predicate("session has client ip", session.ip.length > 0);
  TestValidator.predicate("session has href", session.href.length > 0);
  TestValidator.predicate("session has referrer", session.referrer.length >= 0);
}
