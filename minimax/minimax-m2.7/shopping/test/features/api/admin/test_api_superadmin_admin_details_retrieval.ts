import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_superadmin_admin_details_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(superAdmin);
  // 2. Create regular administrator account to retrieve details for
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(admin);
  // 3. Retrieve admin details as super administrator
  const adminDetails = await api.functional.ecommerceMall.superAdmin.admins.at(
    superAdminConnection,
    {
      adminId: admin.id,
    },
  );
  typia.assert(adminDetails);
  // 4. Validate response structure and data
  TestValidator.equals("admin id matches requested", adminDetails.id, admin.id);
  TestValidator.equals("email matches", adminDetails.email, admin.email);
  TestValidator.equals("name matches", adminDetails.name, admin.name);
  TestValidator.equals(
    "created_at is valid",
    adminDetails.created_at !== null && adminDetails.created_at !== undefined,
    true,
  );
  TestValidator.equals(
    "updated_at is valid",
    adminDetails.updated_at !== null && adminDetails.updated_at !== undefined,
    true,
  );
  TestValidator.equals(
    "deleted_at is null for active admin",
    adminDetails.deleted_at,
    null,
  );
}
