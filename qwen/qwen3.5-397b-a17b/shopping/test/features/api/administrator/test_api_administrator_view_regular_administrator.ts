import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallCustomerProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallCustomerProfile";
import type { IShoppingMallMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallMember";
import type { IShoppingMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator viewing regular administrator account details.
 *
 * Validates that a super administrator can successfully retrieve complete profile information for a regular administrator account. This test ensures the administrator management endpoint returns all required fields including grade level, member account information, and lifecycle timestamps.
 *
 * The test verifies the connection isolation pattern by creating a dedicated super administrator connection, authenticating via the authorize_super_admin_join utility function, and using that connection for the administrator retrieval operation.
 *
 * 1. Super administrator account is created with randomized credentials via authorize_super_admin_join.
 * 2. A valid administrator UUID is generated for the lookup operation.
 * 3. GET /shoppingMall/superAdmin/administrators/{administratorId} is called with super admin credentials.
 * 4. Response is validated against IShoppingMallAdministrator schema using typia.assert().
 * 5. Business logic validation confirms the returned administrator ID matches the requested ID.
 */
export async function test_api_administrator_view_regular_administrator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  // 2. Generate administrator ID for lookup
  const administratorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Retrieve administrator details
  const administrator: IShoppingMallAdministrator =
    await api.functional.shoppingMall.superAdmin.administrators.at(
      superAdminConnection,
      {
        administratorId,
      },
    );
  typia.assert(administrator);
  // 4. Validate business logic: returned ID matches requested ID
  TestValidator.equals(
    "administrator id matches requested id",
    administrator.id,
    administratorId,
  );
}
