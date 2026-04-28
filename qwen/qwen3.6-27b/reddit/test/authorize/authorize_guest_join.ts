import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunityGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest for E2E testing.
 *
 * Creates a guest account with randomized session context including href, referrer, and ip address. The SDK function mutates the connection with the auth token, enabling subsequent API requests as the guest.
 *
 * Guests are ephemeral users without registered accounts. They can browse popular feeds, community feeds, all community listings, user profiles, posts, and comments.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditLikeCommunityGuest.IJoin>;
  },
): Promise<IRedditLikeCommunityGuest.IAuthorized> {
  const joinInput: IRedditLikeCommunityGuest.IJoin = {
    device_fingerprint: props.body?.device_fingerprint,
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  };
  return await api.functional.redditLikeCommunity.auth.guest.join(connection, {
    body: joinInput,
  });
}
