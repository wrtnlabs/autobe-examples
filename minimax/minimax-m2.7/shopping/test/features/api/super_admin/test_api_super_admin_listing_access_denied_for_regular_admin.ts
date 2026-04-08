import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallSuperAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test that a regular administrator cannot access the super admin listing endpoint.
 *
 * Validates exclusive access control for the highest authority level by ensuring regular
 * administrators are denied access to the super admin listing endpoint. First authenticates
 * as a super admin to establish a reference account, then authenticates as a regular admin,
 * and attempts to access the super admin listing endpoint. The system must reject this request
 * with HTTP 403 Forbidden status, confirming that only super administrators can browse and
 * manage super admin listings.
 *
 * 1. Register and authenticate as a super administrator to create a reference account.
 * 2. Register and authenticate as a regular administrator.
 * 3. Attempt to call PATCH /ecommerceMall/superAdmin/superAdmins using the regular admin's credentials.
 * 4. Verify that the request is rejected with HTTP 403 Forbidden status.
 */
export async function test_api_super_admin_listing_access_denied_for_regular_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register and authenticate as a regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {});
  // 3. Attempt to access super admin listing as regular admin
  // 4. Verify HTTP 403 Forbidden is returned
  await TestValidator.httpError(
    "regular admin cannot access super admin listing",
    403,
    async () =>
      await api.functional.ecommerceMall.superAdmin.superAdmins.index(
        adminConnection,
        {
          body: {},
        },
      ),
  );
}
