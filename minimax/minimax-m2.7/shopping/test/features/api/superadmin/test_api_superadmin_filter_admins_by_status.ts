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

export async function test_api_superadmin_filter_admins_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as first super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Create a second super admin account to test status filtering
  await authorize_super_admin_join(
    {
      host: connection.host,
    },
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<string & tags.Format<"password">>(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      },
    },
  );
  // 3. Test filtering with status='active' - should return only active accounts (deleted_at IS NULL)
  const activeAdminsResponse =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "active",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(activeAdminsResponse);
  // Validate that all returned admins have deleted_at as null
  TestValidator.predicate(
    "active filter returns only non-deleted admins",
    () => {
      return activeAdminsResponse.data.every(
        (admin) => admin.deleted_at === null,
      );
    },
  );
  // Validate pagination structure
  TestValidator.predicate("active response has valid pagination", () => {
    return (
      activeAdminsResponse.pagination.pages >= 0 &&
      activeAdminsResponse.pagination.records >= 0 &&
      activeAdminsResponse.pagination.limit > 0
    );
  });
  // 4. Test filtering with status='deleted' - should return only soft-deleted accounts (deleted_at IS NOT NULL)
  const deletedAdminsResponse =
    await api.functional.ecommerceMall.superAdmin.admins.index(
      superAdminConnection,
      {
        body: {
          status: "deleted",
          limit: 100,
        } satisfies IEcommerceMallAdmin.IRequest,
      },
    );
  typia.assert(deletedAdminsResponse);
  // Validate that all returned admins have deleted_at as non-null
  TestValidator.predicate("deleted filter returns only deleted admins", () => {
    return deletedAdminsResponse.data.every(
      (admin) => admin.deleted_at !== null,
    );
  });
  // Validate pagination structure
  TestValidator.predicate("deleted response has valid pagination", () => {
    return (
      deletedAdminsResponse.pagination.pages >= 0 &&
      deletedAdminsResponse.pagination.records >= 0 &&
      deletedAdminsResponse.pagination.limit > 0
    );
  });
}
