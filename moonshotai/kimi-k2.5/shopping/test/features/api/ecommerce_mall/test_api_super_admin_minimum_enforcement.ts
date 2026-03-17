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

import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_minimum_enforcement(
  connection: api.IConnection,
): Promise<void> {
  // Create actor-specific connection for super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Step 1: Join as the sole super administrator
  const superAdmin = await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: "https://test.com/super-admin/join",
        referrer: "https://test.com",
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdmin);
  // Step 2: Verify there is only one super administrator
  const adminList = await api.functional.ecommerceMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {
        grade: "super_admin",
      } satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(adminList);
  TestValidator.equals(
    "only one super admin exists",
    adminList.pagination.records,
    1,
  );
  TestValidator.equals(
    "super admin id matches",
    adminList.data[0]!.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "super admin grade is super_admin",
    adminList.data[0]!.grade,
    "super_admin",
  );
  // Step 3 & 4: Attempt to demote the only super admin and expect 400 error
  await TestValidator.httpError(
    "cannot demote only super admin - minimum enforcement",
    400,
    async () => {
      await api.functional.ecommerceMall.superAdmin.super_admins.update(
        superAdminConnection,
        {
          superAdminId: superAdmin.id,
          body: {
            grade: "regular",
          } satisfies IEcommerceMallSuperAdmin.IUpdate,
        },
      );
    },
  );
  // Step 5: Verify grade remains super_admin after failed demotion
  const adminListAfter =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "super_admin",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(adminListAfter);
  TestValidator.equals(
    "super admin count unchanged",
    adminListAfter.pagination.records,
    1,
  );
  TestValidator.equals(
    "grade remains super_admin",
    adminListAfter.data[0]!.grade,
    "super_admin",
  );
}
