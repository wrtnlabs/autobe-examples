import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IHrmTimeTrackingGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuest";
import type { IHrmTimeTrackingGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IHrmTimeTrackingGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest user for E2E testing.
 *
 * Creates a guest user account with randomized credentials, mutates the connection with the JWT
 * authorization token upon successful registration. The returned session data includes the member
 * identity, device fingerprint, session history, and token pair for authenticated API access.
 *
 * By default, a random email, password, href, and referrer are generated. Provide partial input
 * via `props.body` to override specific fields.
 *
 * @param connection - The API connection to mutate with the authorization token.
 * @param props - Configuration object containing optional partial join input.
 * @returns The full authorized response containing member identity, session info, and tokens.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IHrmTimeTrackingGuest.IJoin>;
  },
): Promise<IHrmTimeTrackingGuest.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IHrmTimeTrackingGuest.IJoin;
  return await api.functional.hrmTimeTracking.auth.guest.join(connection, {
    body: joinInput,
  });
}
