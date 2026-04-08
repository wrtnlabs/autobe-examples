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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_view_own_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new super administrator account
  const superAdminConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_super_admin_join(superAdminConnection, {});
  typia.assert(authorized);
  // 2. Extract the adminId from the registration response
  const adminId = authorized.id;
  // 3. Call GET /ecommerceMall/superAdmin/admins/{adminId} using the extracted adminId
  const adminProfile = await api.functional.ecommerceMall.superAdmin.admins.at(
    superAdminConnection,
    { adminId },
  );
  typia.assert(adminProfile);
  // 4. Validate response contains: id (UUID matching adminId)
  TestValidator.equals("admin id matches", adminProfile.id, adminId);
  // 5. Validate email matches registered email
  TestValidator.equals(
    "email matches registered",
    adminProfile.email,
    authorized.email,
  );
  // 6. Validate deleted_at is null for active account
  TestValidator.equals("account is active", adminProfile.deleted_at, null);
  // 7. Validate timestamps are present (ISO datetime format)
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(adminProfile.created_at),
  );
  TestValidator.predicate(
    "updated_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(adminProfile.updated_at),
  );
  // 8. Validate name field is present (from IEcommerceMallAdmin structure)
  TestValidator.predicate("name field exists", adminProfile.name !== undefined);
}
