import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommercePlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommercePlatformAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new administrator for E2E testing.
 *
 * Creates an administrator account with randomized credentials including email and password,
 * along with session context fields (href, referrer, ip) for security auditing and access tracking.
 * The email is validated for uniqueness across all platform account types (customers, sellers, admins)
 * and rejects with 409 Conflict if duplicate. Returns the authorized admin record with
 * JWT tokens for subsequent API access.
 *
 * @param connection - The API connection instance
 * @param props - Optional partial body properties to override random values
 * @returns The authorized administrator record with authentication tokens
 */
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommercePlatformAdmin.IJoin>;
  },
): Promise<IEcommercePlatformAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip,
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommercePlatformAdmin.IJoin;
  return await api.functional.ecommercePlatform.auth.admin.join(connection, {
    body: joinInput,
  });
}
