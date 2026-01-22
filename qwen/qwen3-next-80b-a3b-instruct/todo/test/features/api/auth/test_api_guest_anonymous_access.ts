import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoListGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListGuest";
import type { ITodoListToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoListToken";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
export async function test_api_guest_anonymous_access(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  // Call the guest join endpoint using the authorization utility function (mandatory)
  const result: ITodoListGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {
      body: {},
    },
  );
  // Validate the response structure and types
  typia.assert(result);
  // Validate that connection headers were updated with the token
  TestValidator.equals(
    "connection has authorization header",
    guestConnection.headers?.Authorization,
    result.token.access,
  );
}
