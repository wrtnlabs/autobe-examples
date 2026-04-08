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
 * Register and authenticate a new guest account for E2E testing.
 *
 * Creates a guest account with randomized device fingerprint and session metadata, mutates the connection with the auth token. The guest account is identified by a unique device fingerprint generated from random alphanumeric characters.
 *
 * Session context fields are automatically generated including href (current page URL), referrer (previous page URL), and optional IP address. These fields are captured for audit and security purposes in the guest session metadata.
 *
 * @param connection - API connection object that will be mutated with the authorization token
 * @param props - Optional customization properties for the guest registration
 * @returns Authorized guest response containing guest ID and JWT tokens
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppGuest.IJoin>;
  },
): Promise<ITodoAppGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint:
      props.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(32),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ITodoAppGuest.IJoin;
  return await api.functional.todoApp.auth.guest.join(connection, {
    body: joinInput,
  });
}
