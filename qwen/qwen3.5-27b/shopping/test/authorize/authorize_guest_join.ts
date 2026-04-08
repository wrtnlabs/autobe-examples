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
 * Register and authenticate a new guest for temporary platform access.
 *
 * Creates a guest session with randomized session context data (href, referrer, ip) for unauthenticated users. The guest is identified by device fingerprint auto-generated from request headers. Returns JWT tokens for temporary access to public platform features.
 *
 * The href field indicates the current page URL where the guest is registering, referrer indicates the source page URL, and ip is the client IP address (optional). These fields are used for security tracking and session management.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallGuest.IJoin>;
  },
): Promise<IShoppingMallGuest.IAuthorized> {
  const joinInput = {
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallGuest.IJoin;
  return await api.functional.shoppingMall.auth.guest.join(connection, {
    body: joinInput,
  });
}
