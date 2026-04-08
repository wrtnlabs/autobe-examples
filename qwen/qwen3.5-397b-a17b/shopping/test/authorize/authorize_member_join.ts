import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new customer member for E2E testing.
 *
 * Creates a member account with randomized credentials, mutates the connection with the auth token, and returns the authorized member information including JWT tokens. The email address is auto-generated and guaranteed to be unique for each test execution.
 *
 * Session context fields (href, referrer, ip) capture the client context where registration occurred. These are stored in shopping_mall_member_sessions for audit trail purposes. The password is auto-generated as a 16-character alphanumeric string.
 *
 * Upon successful registration, the system creates a member record with 'active' status, generates JWT access and refresh tokens, and establishes an authenticated session. The connection object is automatically updated with the access token for subsequent authenticated API calls.
 */
export async function authorize_member_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallMember.IJoin>;
  },
): Promise<IShoppingMallMember.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    href: props.body?.href ?? typia.random<string & tags.Format<"uri">>(),
    referrer:
      props.body?.referrer ?? typia.random<string & tags.Format<"uri">>(),
    ip: props.body?.ip ?? typia.random<string & tags.Format<"ipv4">>(),
  } satisfies IShoppingMallMember.IJoin;
  return await api.functional.shoppingMall.auth.member.join(connection, {
    body: joinInput,
  });
}
