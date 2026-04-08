import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest session for E2E testing.
 *
 * Creates a guest account with randomized device fingerprint and browser context,
 * mutates the connection with the auth token for subsequent authenticated requests.
 * Guests can access public content like popular feeds but have limited permissions
 * compared to registered users.
 *
 * @param connection - HTTP connection object to mutate with auth token
 * @param props - Optional join body overrides
 * @returns IAuthorized with guest session ID and JWT credentials
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditPlatformGuest.IJoin>;
  },
): Promise<IRedditPlatformGuest.IAuthorized> {
  const joinInput = {
    fingerprint: props.body?.fingerprint ?? typia.random<string>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditPlatformGuest.IJoin;
  return await api.functional.redditPlatform.auth.guest.join(connection, {
    body: joinInput,
  });
}
