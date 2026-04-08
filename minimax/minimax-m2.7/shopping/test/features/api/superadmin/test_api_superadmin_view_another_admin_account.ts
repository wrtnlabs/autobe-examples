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

export async function test_api_superadmin_view_another_admin_account(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register first super administrator (admin A)
  const adminAConnection: api.IConnection = { host: connection.host };
  const adminA: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(adminAConnection, {});
  typia.assert(adminA);
  // 2. Register second super administrator (admin B)
  const adminBConnection: api.IConnection = { host: connection.host };
  const adminB: IEcommerceMallSuperAdmin.IAuthorized =
    await authorize_super_admin_join(adminBConnection, {});
  typia.assert(adminB);
  // 3. Extract adminId of admin B from registration response
  const adminBId: string & tags.Format<"uuid"> = adminB.id;
  // 4. Call GET /ecommerceMall/superAdmin/admins/{adminId} as admin A
  const viewedAdmin: IEcommerceMallAdmin =
    await api.functional.ecommerceMall.superAdmin.admins.at(adminAConnection, {
      adminId: adminBId,
    });
  typia.assert(viewedAdmin);
  // 5. Verify the response returns valid IEcommerceMallAdmin structure
  TestValidator.equals("admin id matches", viewedAdmin.id, adminBId);
  TestValidator.equals("email matches", viewedAdmin.email, adminB.email);
  // 6. Validate response contains admin B's correct email, name, and timestamps
  TestValidator.predicate(
    "has valid created_at timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(viewedAdmin.created_at),
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(viewedAdmin.updated_at),
  );
  TestValidator.equals(
    "deleted_at should be null for active admin",
    viewedAdmin.deleted_at,
    null,
  );
  // 7. Confirm password_hash is NOT present in response (IEcommerceMallAdmin doesn't have it)
  // Since IEcommerceMallAdmin structure doesn't include password_hash,
  // typia.assert already validates it's not in the response
  TestValidator.predicate(
    "password_hash not exposed in response",
    !("password_hash" in viewedAdmin),
  );
}
