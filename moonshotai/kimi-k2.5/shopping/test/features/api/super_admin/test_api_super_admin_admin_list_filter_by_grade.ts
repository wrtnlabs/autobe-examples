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

export async function test_api_super_admin_admin_list_filter_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Register as super administrator to gain access
  await api.functional.ecommerceMall.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IEcommerceMallSuperAdmin.IJoin,
    },
  );
  // Test filtering by super_admin grade
  const superAdminList =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "super_admin",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(superAdminList);
  // Verify all returned admins have super_admin grade
  for (const admin of superAdminList.data) {
    TestValidator.equals(
      "super_admin filter returns only super_admin grade",
      admin.grade,
      "super_admin",
    );
  }
  // Test filtering by regular grade
  const regularList =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(regularList);
  // Verify all returned admins have regular grade
  for (const admin of regularList.data) {
    TestValidator.equals(
      "regular filter returns only regular grade",
      admin.grade,
      "regular",
    );
  }
}
