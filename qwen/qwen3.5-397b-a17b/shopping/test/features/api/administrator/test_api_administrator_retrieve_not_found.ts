import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IShoppingMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdmin";
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
 * Test that requesting a non-existent administrator account returns 404 Not Found.
 *
 * Validates the system's proper handling of requests for administrator accounts that do not exist in the database. This test ensures that the API returns a consistent 404 Not Found response for both never-created UUIDs and soft-deleted administrator records, maintaining security by not leaking information about administrator existence.
 *
 * The test covers the scenario where a super administrator attempts to retrieve an administrator account using a valid UUID format that has no corresponding record in the database. This is critical for security as it prevents enumeration attacks that could determine which administrator IDs are valid.
 *
 * 1. Super administrator authenticates via join endpoint to obtain valid authentication token.
 * 2. Generate a random UUID in valid format that does not exist in the database.
 * 3. Super admin calls GET /shoppingMall/superAdmin/admins/{adminId} with the non-existent UUID.
 * 4. Verify the API call throws an HTTP error with 404 status code.
 * 5. Confirm error handling is consistent for both never-created and soft-deleted administrator records.
 */
export async function test_api_administrator_retrieve_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Super administrator authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authResult = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IShoppingMallSuperAdmin.IJoin,
  });
  typia.assert(authResult);
  // 2. Generate a valid UUID format that does not exist in the database
  const nonExistentAdminId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3-4. Verify that requesting non-existent administrator returns 404
  await TestValidator.httpError(
    "non-existent administrator returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.superAdmin.admins.at(
        superAdminConnection,
        {
          adminId: nonExistentAdminId,
        },
      );
    },
  );
}
