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

export async function test_api_admin_details_retrieval_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {});
  // 2. Register a regular administrator account to retrieve details for
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {});
  // 3. Super admin retrieves the admin's details
  const adminDetails = await api.functional.ecommerceMall.admin.admin.admins.at(
    superAdminConnection,
    {
      adminId: admin.id,
    },
  );
  typia.assert(adminDetails);
  // 4. Validate the response matches expected admin entity
  TestValidator.equals("admin id matches", adminDetails.id, admin.id);
  TestValidator.equals("email matches", adminDetails.email, admin.email);
  TestValidator.equals("name matches", adminDetails.name, admin.name);
  TestValidator.equals(
    "deleted_at is null (active account)",
    adminDetails.deleted_at,
    null,
  );
}
