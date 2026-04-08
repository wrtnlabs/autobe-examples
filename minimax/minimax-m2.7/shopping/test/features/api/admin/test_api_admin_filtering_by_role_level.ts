import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMall";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMall } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMall";
import type { IPageIEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_admin_filtering_by_role_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super admin account via POST /ecommerceMall/auth/superAdmin/join
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // Create authenticated connection with super admin token
  const adminConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: `Bearer ${authorized.token.access}`,
    },
  };
  // 2. Call PATCH /ecommerceMall/superAdmin/admins with superAdmin=true filter
  const superAdminsPage =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      adminConnection,
      {
        body: {
          superAdmin: true,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(superAdminsPage);
  // 3. Verify all returned admins have is_super_admin=true
  for (const admin of superAdminsPage.data) {
    TestValidator.equals(
      "admin has is_super_admin=true",
      admin.is_super_admin,
      true,
    );
  }
  // 4. Verify the super admin performing the query can see themselves in the superAdmin=true results
  TestValidator.predicate(
    "super admin can see themselves in superAdmin=true filter",
    superAdminsPage.data.some((admin) => admin.id === authorized.id),
  );
  // 5. Call PATCH /ecommerceMall/superAdmin/admins with superAdmin=false filter
  const regularAdminsPage =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      adminConnection,
      {
        body: {
          superAdmin: false,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(regularAdminsPage);
  // 6. Verify all returned admins have is_super_admin=false
  for (const admin of regularAdminsPage.data) {
    TestValidator.equals(
      "admin has is_super_admin=false",
      admin.is_super_admin,
      false,
    );
  }
  // 7. Verify the super admin does NOT appear in the superAdmin=false results
  TestValidator.predicate(
    "super admin cannot see themselves in superAdmin=false filter",
    !regularAdminsPage.data.some((admin) => admin.id === authorized.id),
  );
}
