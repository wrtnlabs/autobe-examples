import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuest";
import type { IRedditCloneGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest for E2E testing.
 *
 * Creates a guest account with randomized device fingerprint and session context,
 * mutates the connection with the auth token. Guest accounts enable unauthenticated
 * visitors to browse public content without traditional credentials.
 *
 * The device fingerprint uniquely identifies the guest's device or browser across
 * sessions, allowing the system to recognize returning guests and maintain session
 * continuity. Session context fields (href, referrer, ip) are captured for security
 * tracking and analytics purposes.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IRedditCloneGuest.IJoin>;
  },
): Promise<IRedditCloneGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint:
      props.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(32),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IRedditCloneGuest.IJoin;
  return await api.functional.redditClone.auth.guest.join(connection, {
    body: joinInput,
  });
}
