import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_account_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create a new connection for admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate an admin to get a valid session
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IShoppingMallAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Create a new connection using the authenticated admin's token
  const retrieveConnection: api.IConnection = { host: connection.host };
  // Test 1: Successfully retrieve admin account details
  const retrievedAdmin = await api.functional.shoppingMall.admin.admins.at(
    retrieveConnection,
    {
      adminId: adminAuth.id,
    },
  );
  typia.assert(retrievedAdmin);
  // Test 2: Verify that unauthorized users cannot access admin account details
  // Create an unauthenticated connection (clean, no authorization)
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  // This should throw because no authentication token provided
  await TestValidator.error(
    "unauthenticated user should not be able to retrieve admin account",
    async () => {
      await api.functional.shoppingMall.admin.admins.at(
        unauthenticatedConnection,
        {
          adminId: adminAuth.id,
        },
      );
    },
  );
}
