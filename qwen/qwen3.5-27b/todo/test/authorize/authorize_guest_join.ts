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
 * Creates a guest account with randomized device fingerprint and session context, mutates the connection with the auth token. Guests are unauthenticated users identified by device fingerprint instead of email/password credentials. The function generates random URIs for href and referrer fields, and an optional IPv4 address for the ip field.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ITodoAppGuest.IJoin>;
  },
): Promise<ITodoAppGuest.IAuthorized> {
  const joinInput = {
    deviceFingerprint:
      props.body?.deviceFingerprint ?? RandomGenerator.alphaNumeric(32),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip:
      props.body?.ip ??
      (Math.random() < 0.5
        ? typia.random<string & tags.Format<"ipv4">>()
        : undefined),
  } satisfies ITodoAppGuest.IJoin;
  return await api.functional.todoApp.auth.guest.join(connection, {
    body: joinInput,
  });
}
