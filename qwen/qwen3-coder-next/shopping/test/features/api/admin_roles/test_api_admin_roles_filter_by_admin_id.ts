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

export async function test_api_admin_roles_filter_by_admin_id(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(superAdmin);
  // Create regular admin accounts
  const regularAdmins: IEcommerceMallAdmin.IAuthorized[] = await Promise.all(
    ArrayUtil.repeat(3, () =>
      authorize_admin_join(
        { host: connection.host },
        {
          body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
          },
        },
      ),
    ),
  );
  // Test filtering by super admin's own ID
  const superAdminFilterResponse =
    await api.functional.ecommerceMall.admin.admin_roles.index(
      superAdminConnection,
      {
        body: {
          admin_id: superAdmin.id,
        } satisfies IEcommerceMallAdminRole.IRequest,
      },
    );
  typia.assert(superAdminFilterResponse);
  // Verify only super admin role is returned
  TestValidator.equals(
    "only super admin role returned",
    superAdminFilterResponse.data.length,
    1,
  );
  TestValidator.equals(
    "correct admin grade",
    superAdminFilterResponse.data[0].grade,
    "super",
  );
  // Test filtering by non-existent admin ID
  const nonExistentFilterResponse =
    await api.functional.ecommerceMall.admin.admin_roles.index(
      superAdminConnection,
      {
        body: {
          admin_id: typia.random<string & tags.Format<"uuid">>(),
        } satisfies IEcommerceMallAdminRole.IRequest,
      },
    );
  typia.assert(nonExistentFilterResponse);
  TestValidator.equals(
    "no results for non-existent admin",
    nonExistentFilterResponse.data.length,
    0,
  );
  // Test time-based filtering
  const now = new Date().toISOString();
  const timeFilterResponse =
    await api.functional.ecommerceMall.admin.admin_roles.index(
      superAdminConnection,
      {
        body: {
          created_at_from: now,
          created_at_to: now,
        } satisfies IEcommerceMallAdminRole.IRequest,
      },
    );
  typia.assert(timeFilterResponse);
  // Test filtering by grade
  const regularFilterResponse =
    await api.functional.ecommerceMall.admin.admin_roles.index(
      superAdminConnection,
      {
        body: {
          grade: "regular",
        } satisfies IEcommerceMallAdminRole.IRequest,
      },
    );
  typia.assert(regularFilterResponse);
  TestValidator.predicate(
    "all regular admins returned",
    regularFilterResponse.data.every((role) => role.grade === "regular"),
  );
  // Test combined filtering
  const combinedFilterResponse =
    await api.functional.ecommerceMall.admin.admin_roles.index(
      superAdminConnection,
      {
        body: {
          admin_id: superAdmin.id,
          grade: "super",
        } satisfies IEcommerceMallAdminRole.IRequest,
      },
    );
  typia.assert(combinedFilterResponse);
  TestValidator.equals(
    "combined filter returns one result",
    combinedFilterResponse.data.length,
    1,
  );
  TestValidator.equals(
    "combined filter correct grade",
    combinedFilterResponse.data[0].grade,
    "super",
  );
}
