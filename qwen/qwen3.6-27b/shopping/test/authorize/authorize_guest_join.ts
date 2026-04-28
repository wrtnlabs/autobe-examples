import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest account for E2E testing.
 *
 * Creates a guest account using device fingerprint identification, then mutates the
 * connection with the auth token. This enables unauthenticated visitors to access
 * platform features without requiring full credentials.
 *
 * @param connection - The API connection to authenticate
 * @param props - Optional body properties to override defaults
 * @returns The authorized guest session with tokens
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformGuest.IJoin>;
  },
): Promise<IEcommercePlatformGuest.IAuthorized> {
  const joinBody: IEcommercePlatformGuest.IJoin = {
    device_fingerprint:
      props.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(32),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  };
  return await api.functional.ecommercePlatform.auth.guest.join(connection, {
    body: joinBody,
  });
}
