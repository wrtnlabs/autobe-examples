import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdmin";
import type { IEcommerceAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceAdministratorGrade";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new administrator for E2E testing.
 *
 * Creates an administrator account with randomized credentials, mutates the connection with the auth token, and returns the authorized administrator profile. This function handles the complete registration flow including credential generation and connection header mutation.
 *
 * **Credentials Generation**
 * - Email: Random email address using typia.random with email format validation
 * - Password: 16-character alphanumeric string via RandomGenerator
 * - Reason: Random paragraph text for approval justification
 * - Href/Referrer: Random URI strings for session tracking
 * - IP: Optional random IPv4 address
 *
 * **Connection Mutation**
 * The function automatically mutates the connection object's Authorization header with the returned access token, enabling subsequent authenticated API calls without manual token management.
 *
 * @param connection HTTP connection configuration
 * @param props Optional body overrides for testing specific scenarios
 * @returns Authorized administrator profile with JWT tokens
 */
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IEcommerceAdmin.IJoin>;
  } = {},
): Promise<IEcommerceAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    reason: props.body?.reason ?? RandomGenerator.paragraph(),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IEcommerceAdmin.IJoin;
  return await api.functional.ecommerce.auth.admin.join(connection, {
    body: joinInput,
  });
}
