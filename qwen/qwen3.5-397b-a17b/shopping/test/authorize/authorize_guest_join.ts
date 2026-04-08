import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest user for E2E testing.
 *
 * Creates a guest account with a randomized device fingerprint, mutates the connection with the auth token. Guest accounts are temporary sessions identified by device fingerprint for unauthenticated browsing access.
 *
 * The device_fingerprint uniquely identifies the guest's device and enables session persistence across page views. If a guest with the same fingerprint already exists, the system returns the existing guest's session tokens instead of creating a duplicate account.
 *
 * Optional href, referrer, and ip fields capture connection metadata for security monitoring and analytics. These fields support server-side rendering scenarios where client information may not be available.
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
