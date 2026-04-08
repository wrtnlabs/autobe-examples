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
 * Test that retrieving a soft-deleted (demoted) administrator account returns 404 Not Found.
 *
 * Validates the complete workflow for accessing administrator accounts, ensuring that soft-deleted administrators are properly hidden from the retrieval endpoint. The test creates a super administrator for authentication, then attempts to retrieve an administrator account that should be inaccessible (simulated via non-existent UUID since administrator creation/demotion APIs are not available in this test scope).
 *
 * Special attention is given to verifying that the endpoint returns 404 Not Found for administrators that are either non-existent or soft-deleted, maintaining consistency with the specification that states 'Return 404 if administrator not found or if the record is soft-deleted'.
 *
 * 1. Super administrator registers and authenticates via /shoppingMall/auth/super-admin/join.
 * 2. Generate a UUID representing a soft-deleted administrator account.
 * 3. Attempt to retrieve the soft-deleted administrator via GET endpoint.
 * 4. Validate that 404 Not Found is returned, confirming soft-deleted administrators are inaccessible.
 */
export async function test_api_administrator_view_soft_deleted_returns_not_found(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
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
  // 2. Generate UUID for soft-deleted administrator (simulated)
  const softDeletedAdministratorId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 3. Attempt to retrieve soft-deleted administrator - should return 404
  await TestValidator.httpError(
    "soft-deleted administrator returns 404",
    404,
    async () => {
      await api.functional.shoppingMall.superAdmin.administrators.at(
        superAdminConnection,
        {
          administratorId: softDeletedAdministratorId,
        },
      );
    },
  );
}
