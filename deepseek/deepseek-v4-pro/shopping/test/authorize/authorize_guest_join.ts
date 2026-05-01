import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import type { IShoppingMallGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuestSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest visitor for E2E testing.
 *
 * Creates a guest account identified by a unique device fingerprint, mutates the
 * connection with the resulting JWT access token. The device fingerprint is a
 * random alphanumeric string simulating client-side device characteristics
 * (browser, OS, screen resolution). Session context fields (href, referrer, ip)
 * are generated with valid URI and IPv4 formats for audit trail purposes.
 *
 * On success, the connection's Authorization header is populated with the access
 * token, and the full authorized response is returned containing the guest
 * identity, all session records, and the JWT token pair for subsequent API calls.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallGuest.IJoin>;
  },
): Promise<IShoppingMallGuest.IAuthorized> {
  const joinInput = {
    device_fingerprint:
      props.body?.device_fingerprint ?? RandomGenerator.alphaNumeric(32),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.IJoin;
  return await api.functional.shoppingMall.auth.guest.join(connection, {
    body: joinInput,
  });
}
