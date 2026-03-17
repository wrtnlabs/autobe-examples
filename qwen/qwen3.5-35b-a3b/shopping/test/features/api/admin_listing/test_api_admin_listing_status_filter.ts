import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_listing_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator using utility function
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(superAdminConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    });
  typia.assert(superAdmin);
  // Step 2: Create a new connection for super admin API calls with the token
  const adminApiConnection: api.IConnection = { host: connection.host };
  adminApiConnection.headers = {
    ...adminApiConnection.headers,
    Authorization: superAdmin.token.access,
  };
  // Step 3: Test status filter with 'active'
  const activeResponse =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      adminApiConnection,
      {
        body: {
          status: "active" as const,
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(activeResponse);
  // Step 4: Validate 'active' filter results
  // Verify all returned admins have status='active'
  for (const admin of activeResponse.data) {
    TestValidator.equals(
      "active filter - admin status is active",
      admin.status,
      "active",
    );
  }
  // Step 5: Test status filter with 'suspended'
  const suspendedResponse =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      adminApiConnection,
      {
        body: {
          status: "suspended" as const,
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(suspendedResponse);
  // Step 6: Validate 'suspended' filter results
  // Verify all returned admins have status='suspended'
  for (const admin of suspendedResponse.data) {
    TestValidator.equals(
      "suspended filter - admin status is suspended",
      admin.status,
      "suspended",
    );
  }
  // Step 7: Validate pagination metadata for filtered results
  TestValidator.equals(
    "active filter - pagination records",
    activeResponse.pagination.records,
    activeResponse.data.length,
  );
  TestValidator.equals(
    "suspended filter - pagination records",
    suspendedResponse.pagination.records,
    suspendedResponse.data.length,
  );
  // Step 8: Verify the two queries returned data (filtering is working)
  // At least one query should have returned data if the system has admins
  TestValidator.predicate(
    "at least one filter returned admins",
    activeResponse.data.length > 0 || suspendedResponse.data.length > 0,
  );
}
