import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest for E2E testing.
 *
 * Creates a guest account with randomized device fingerprint and connection context, mutates the connection with the auth token for subsequent requests.
 *
 * **Device Fingerprint**
 *
 * The device_fingerprint is generated as a random alphanumeric string between 1-256 characters, serving as the unique identifier for the guest account across multiple sessions.
 *
 * **Session Context**
 *
 * The href and referrer fields are generated as valid URIs to capture the client's connection context at registration time. The optional ip field may be provided or omitted depending on the test scenario.
 *
 * @param connection The HTTP connection configuration
 * @param props Optional properties for customizing the join request
 * @param props.body Optional partial join request body for customizing specific fields
 * @returns The authorized guest response containing guest_id and JWT tokens
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props?: {
    body?: DeepPartial<IRedditLikeGuest.IJoin>;
  },
): Promise<IRedditLikeGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint:
      props?.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(32),
    href: props?.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props?.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props?.body?.ip ?? undefined,
  } satisfies IRedditLikeGuest.IJoin;
  return await api.functional.redditLike.auth.guest.join(connection, {
    body: joinInput,
  });
}
