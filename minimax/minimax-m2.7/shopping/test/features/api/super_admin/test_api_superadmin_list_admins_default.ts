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

export async function test_api_superadmin_list_admins_default(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Call the admins listing endpoint without filters to retrieve all active administrators by default
  const adminsPage = await api.functional.ecommerceMall.superAdmin.admins.index(
    superAdminConnection,
    {
      body: {} satisfies IEcommerceMallAdmin.IRequest,
    },
  );
  typia.assert(adminsPage);
  // 3. Verify response returns paginated list containing admin summaries
  TestValidator.equals("data is array", Array.isArray(adminsPage.data), true);
  TestValidator.predicate(
    "has at least 1 admin (self)",
    adminsPage.data.length >= 1,
  );
  // 4. Validate admin summary fields exist (id, email, name, created_at, updated_at, deleted_at)
  for (const admin of adminsPage.data) {
    typia.assert(admin);
    TestValidator.predicate("has id", admin.id !== undefined);
    TestValidator.predicate("has email", admin.email !== undefined);
    TestValidator.predicate("has name", admin.name !== undefined);
    TestValidator.predicate("has created_at", admin.created_at !== undefined);
    TestValidator.predicate("has updated_at", admin.updated_at !== undefined);
    TestValidator.predicate("has deleted_at", admin.deleted_at !== undefined);
  }
  // 5. Validate pagination metadata includes current page, limit, total records, and total pages
  const pagination = adminsPage.pagination;
  typia.assert(pagination);
  TestValidator.predicate("has current page", pagination.current !== undefined);
  TestValidator.predicate("has limit", pagination.limit !== undefined);
  TestValidator.predicate(
    "has records count",
    pagination.records !== undefined,
  );
  TestValidator.predicate("has total pages", pagination.pages !== undefined);
}
