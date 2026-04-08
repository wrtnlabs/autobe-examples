import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest for E2E testing.
 *
 * Creates a guest account with randomized device fingerprint and session context, mutates the connection with the auth token. The guest account enables unauthenticated visitors to access public pages and maintain session state across browser sessions.
 *
 * The device fingerprint uniquely identifies the visitor's device. If not provided in props.body, a random 32-character alphanumeric string is generated. Session context fields (href, referrer, ip) capture the request context for audit and analytics.
 *
 * @param connection The API connection object that will be mutated with the authorization token.
 * @param props Optional body properties to override random generation.
 * @returns The authorized guest response containing guest ID and JWT tokens.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmPlatformGuest.IJoin>;
  },
): Promise<IHrmPlatformGuest.IAuthorized> {
  const joinInput = {
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    device_fingerprint:
      props.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(32),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmPlatformGuest.IJoin;
  return await api.functional.hrmPlatform.auth.guest.join(connection, {
    body: joinInput,
  });
}
