import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ITodoAppGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ITodoAppGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest user for E2E testing.
 *
 * Creates a guest account with randomized device fingerprint and session context, mutates the connection with the auth token. Guest accounts are identified solely by device fingerprint, requiring no email or password credentials.
 *
 * **Random Data Generation**
 *
 * - device_fingerprint: Random alphanumeric string for unique device identification
 * - href: Random URI using typia.random for current page URL
 * - referrer: Random URI using typia.random for referring page URL
 * - ip: Optional random IPv4 address if provided in props.body
 *
 * **Authentication Flow**
 *
 * 1. Construct join input with randomized or provided values
 * 2. Call api.functional.todoApp.auth.guest.join with the connection and input
 * 3. The SDK function automatically sets the Authorization header with the access token
 * 4. Return the authorized response containing guest identity and session tokens
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppGuest.IJoin>;
  },
): Promise<ITodoAppGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint:
      props.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppGuest.IJoin;
  return await api.functional.todoApp.auth.guest.join(connection, {
    body: joinInput,
  });
}
