import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppAccessToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppAccessToken";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";
/**
 * Validates the public accessibility of the guest API endpoint.
 *
 * This test ensures that the endpoint `/auth/guest/public` is reachable without
 * any authentication token, reflecting the design that this guest API resource
 * is publicly accessible to unauthenticated users.
 *
 * The test workflow includes:
 *
 * 1. Executing the prerequisite guest join operation to register a guest user,
 *    establishing context for guest actor authorization.
 * 2. Creating a new unauthenticated connection without any authorization headers.
 * 3. Invoking the public endpoint `/auth/guest/public` using the unauthenticated
 *    connection.
 * 4. Asserting that the endpoint is successfully accessible and does not throw any
 *    errors.
 *
 * This test serves to validate both security and accessibility constraints of
 * the guest API schema, ensuring guest users have limited yet public endpoint
 * access as intended.
 */
export async function test_api_guest_public_accessibility(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a guest connection and perform join to obtain authorization tokens
  const guestConnection: api.IConnection = { host: connection.host };
  const authorizedGuest: ITodoAppGuest.IAuthorized = await authorize_guest_join(
    guestConnection,
    {},
  );
  typia.assert(authorizedGuest);
  // Step 2: Create an unauthenticated connection for public access
  const publicConnection: api.IConnection = { host: connection.host };
  // Step 3: Call the public guest endpoint which does not require authentication
  await api.functional.auth.guest._public.nullAuthOperation(publicConnection);
}
