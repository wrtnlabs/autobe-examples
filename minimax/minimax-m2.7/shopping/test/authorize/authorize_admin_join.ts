import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new admin for E2E testing.
 *
 * Creates an administrator account with randomized credentials, mutates the connection with the auth token.
 *
 * **Authentication Flow:**
 *
 * 1. Generates random email, password (16 alphanumeric chars), and name for the admin account.
 * 2. Creates session context with random href/referrer URIs and optional client IP.
 * 3. Calls the admin join endpoint to register the account.
 * 4. Extracts the access token from the response and sets it on the connection headers for subsequent authenticated requests.
 *
 * @param connection - API connection object that will be mutated with the auth token
 * @param props.body - Optional overrides for the join request body
 * @returns Promise resolving to the authorized admin data including JWT tokens
 */
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceMallAdmin.IJoin>;
  },
): Promise<IEcommerceMallAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    name: props.body?.name ?? RandomGenerator.name(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
  } satisfies IEcommerceMallAdmin.IJoin;
  return await api.functional.ecommerceMall.auth.admin.join(connection, {
    body: joinInput,
  });
}
