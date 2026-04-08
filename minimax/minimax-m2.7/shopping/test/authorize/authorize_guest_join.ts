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
 * Create a guest session for E2E testing.
 *
 * Establishes a guest account identified by device fingerprint for tracking
 * unauthenticated visitors. Generates random fingerprint, href (current page
 * URL), and referrer (referring URL) data if not provided, then calls the
 * guest join API and mutates the connection with the auth token for subsequent
 * authenticated requests.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallGuest.IJoin>;
  },
): Promise<IEcommerceMallGuest.IAuthorized> {
  const joinInput = {
    fingerprint:
      props.body?.fingerprint ??
      (RandomGenerator.alphaNumeric(32) as string & tags.MinLength<1>),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallGuest.IJoin;
  return await api.functional.ecommerceMall.auth.guest.join(connection, {
    body: joinInput,
  });
}
