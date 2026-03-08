import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_join_success(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for the guest
  const guestConnection: api.IConnection = { host: connection.host };
  // Execute guest join using the utility function
  const authorized: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {},
  );
  // Validate the complete response structure
  typia.assert(authorized);
  // Verify the connection now has the access token set
  TestValidator.predicate(
    "connection has authorization header",
    () => guestConnection.headers?.Authorization !== undefined,
  );
}
