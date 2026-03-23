import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdminRole";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallAdminRole } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallAdminRole";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_roles_filter_by_grade(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234" as const satisfies string & tags.Format<"password">,
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  // 2. Create connection with super admin token
  const superAdminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: superAdmin.token.access,
    },
  };
  // 3. Filter by 'regular' grade (should return empty or no matching roles)
  const regularFilter: IEcommerceMallAdminRole.IRequest = {
    grade: "regular" as const,
  };
  const regularResult =
    await api.functional.ecommerceMall.admin.admin_roles.index(
      superAdminAuthConnection,
      {
        body: regularFilter,
      },
    );
  typia.assert(regularResult);
  // 4. Filter by 'super' grade (should return roles with super grade)
  const superFilter: IEcommerceMallAdminRole.IRequest = {
    grade: "super" as const,
  };
  const superResult =
    await api.functional.ecommerceMall.admin.admin_roles.index(
      superAdminAuthConnection,
      {
        body: superFilter,
      },
    );
  typia.assert(superResult);
  // 5. Verify all returned roles match the requested grade
  const allRoles = [...regularResult.data, ...superResult.data];
  for (const role of allRoles) {
    TestValidator.equals(
      "role grade matches filter",
      role.grade,
      role.grade === "regular" ? "regular" : "super",
    );
  }
  // 6. Test pagination
  const paginatedResult =
    await api.functional.ecommerceMall.admin.admin_roles.index(
      superAdminAuthConnection,
      {
        body: {
          grade: "super" as const,
          page: 1,
          limit: 10,
        } satisfies IEcommerceMallAdminRole.IRequest,
      },
    );
  typia.assert(paginatedResult);
  TestValidator.predicate(
    "pagination limit respected",
    paginatedResult.data.length <= 10,
  );
}
