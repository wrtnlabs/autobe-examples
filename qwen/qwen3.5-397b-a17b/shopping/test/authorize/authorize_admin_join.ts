import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Register and authenticate a new administrator for E2E testing.
 *
 * Creates an administrator account with randomized credentials and grade level, mutates the connection with the auth token. The function generates unique email addresses, secure passwords, and randomly assigns administrator grade (regular or super).
 *
 * This authorization utility is designed for end-to-end test scenarios requiring administrator authentication. The generated admin account can be used immediately for subsequent authenticated API calls as the connection is automatically updated with the access token.
 *
 * @param connection - The API connection object that will be mutated with the authorization token
 * @param props - Optional configuration for customizing the admin account creation
 * @param props.body - Partial admin join data allowing test-specific overrides
 * @returns Authorized administrator data including account details and JWT tokens
 */
export async function authorize_admin_join(
  connection: api.IConnection,
  props: {
    body?: DeepPartial<IShoppingMallAdmin.IJoin>;
  },
): Promise<IShoppingMallAdmin.IAuthorized> {
  const joinInput = {
    email: props.body?.email ?? typia.random<string & tags.Format<"email">>(),
    password: props.body?.password ?? RandomGenerator.alphaNumeric(16),
    grade:
      props.body?.grade ?? RandomGenerator.pick(["regular", "super"] as const),
  } satisfies IShoppingMallAdmin.IJoin;
  return await api.functional.shoppingMall.auth.admin.join(connection, {
    body: joinInput,
  });
}
