import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallGuest";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest user or refresh an existing guest session for E2E testing.
 *
 * Creates a guest account with a randomized device fingerprint and session context including IP address, current page URL, and optional referrer. Mutates the connection with the received auth token for subsequent authenticated requests.
 *
 * @param connection - The API connection object to mutate with the auth token
 * @param props - Optional join properties with customizable fields (defaults to random values)
 * @returns The authorized guest response containing the guest ID and authentication tokens
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallGuest.IJoin>;
  },
): Promise<IEcommerceMallGuest.IAuthorized> {
  const joinInput = {
    fingerprint: props.body?.fingerprint ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallGuest.IJoin;
  return await api.functional.ecommerceMall.auth.guest.join(connection, {
    body: joinInput,
  });
}
