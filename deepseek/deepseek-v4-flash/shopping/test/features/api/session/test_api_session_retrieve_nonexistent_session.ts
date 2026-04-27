import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomer";
import type { IECommerceMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallCustomerProfile";
import type { IECommerceMallSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";

export async function test_api_session_retrieve_nonexistent_session(
  connection: api.IConnection,
): Promise<void> {
  // Create customer connection and authenticate
  const customerConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_customer_join(customerConnection, {});
  typia.assert(authorized);
  // Attempt to retrieve a session with a UUID that does not exist
  const nonExistentSessionId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.httpError(
    "retrieve nonexistent session",
    404,
    async () => {
      await api.functional.eCommerceMall.customer.sessions.at(
        customerConnection,
        { sessionId: nonExistentSessionId },
      );
    },
  );
}
