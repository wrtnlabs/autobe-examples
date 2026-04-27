import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IECommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IECommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest account for E2E testing.
 *
 * Creates a guest session with a randomly generated device fingerprint, sets up
 * navigation context with random page URLs, and mutates the connection with the
 * returned JWT access token. If the device fingerprint already exists, the
 * existing guest record is reused with a new session.
 *
 * The guest account provides temporary, unauthenticated access identified by a
 * device identifier. The returned tokens authorize subsequent API calls within
 * the authentication boundary (login and registration pages only).
 *
 * @param connection Connection configuration that receives the auth token
 * @param props Optional overrides for the guest registration input body
 * @returns The guest authorization response containing guest UUID and token
 *   bundle
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IECommerceMallGuest.IJoin>;
  },
): Promise<IECommerceMallGuest.IAuthorized> {
  const body: IECommerceMallGuest.IJoin = {
    device_identifier:
      props.body?.device_identifier ?? RandomGenerator.alphaNumeric(32),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IECommerceMallGuest.IJoin;
  return await api.functional.eCommerceMall.auth.guest.join(connection, {
    body,
  });
}
