import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IErpHrmGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IErpHrmGuest";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new guest user for E2E testing.
 *
 * Creates a guest account with randomized credentials — email, password, display name,
 * and session context (href, referrer) — falling back to any overrides provided via
 * the `body` property. The `ip` field is optional and defaults to undefined when not
 * supplied, allowing the server to capture the client IP from the request context.
 *
 * Upon successful registration, the SDK mutates the connection's Authorization header
 * with the resulting access token, enabling subsequent authenticated API calls without
 * manual header management.
 */
export async function authorize_guest_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IErpHrmGuest.IJoin>;
  },
): Promise<IErpHrmGuest.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    display_name: props.body?.display_name ?? RandomGenerator.name(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? undefined,
  } satisfies IErpHrmGuest.IJoin;
  return await api.functional.erpHrm.auth.guest.join(connection, {
    body: joinInput,
  });
}
