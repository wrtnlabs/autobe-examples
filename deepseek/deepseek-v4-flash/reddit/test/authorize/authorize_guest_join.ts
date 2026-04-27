import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest visitor for E2E testing.
 *
 * Creates or retrieves a guest identity using a device fingerprint, establishes
 * a guest session, and mutates the connection with the JWT access token for
 * subsequent API requests. The device fingerprint enables returning guests to
 * resume their existing identity.
 *
 * When no explicit `device_fingerprint` is provided, a random alphanumeric
 * string is generated to simulate a unique device. The `href`, `referrer`, and
 * `ip` fields are also randomly generated when not specified.
 *
 * @param connection - Connection to the backend server (mutated with auth token)
 * @param props - Join request configuration with optional field overrides
 * @returns Guest authorization containing guest ID and JWT tokens
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<ICommunityPlatformGuest.IJoin>;
  },
): Promise<ICommunityPlatformGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint:
      props.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(32),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip,
  } satisfies ICommunityPlatformGuest.IJoin;
  return await api.functional.communityPlatform.auth.guest.join(connection, {
    body: joinInput,
  });
}
