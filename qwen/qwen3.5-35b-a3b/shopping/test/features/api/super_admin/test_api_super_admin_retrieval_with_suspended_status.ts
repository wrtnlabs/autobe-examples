import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

export async function test_api_super_admin_retrieval_with_suspended_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuthorized = await authorize_super_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(adminAuthorized);
  // 2. Create a second super administrator account
  const admin2Connection: api.IConnection = { host: connection.host };
  const admin2Authorized = await authorize_super_admin_join(admin2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IEcommerceMallSuperAdmin.IJoin,
  });
  typia.assert(admin2Authorized);
  // 3. Retrieve the second super admin details
  const retrievedAdmin =
    await api.functional.ecommerceMall.superAdmin.super_admins.at(
      adminConnection,
      {
        superAdminId: admin2Authorized.id,
      },
    );
  typia.assert(retrievedAdmin);
  // 4. Validate that all account fields are present and correct
  TestValidator.equals(
    "admin ID matches",
    retrievedAdmin.id,
    admin2Authorized.id,
  );
  TestValidator.equals(
    "admin email matches",
    retrievedAdmin.email,
    admin2Authorized.email,
  );
  TestValidator.equals(
    "admin full name matches",
    retrievedAdmin.fullName,
    admin2Authorized.fullName,
  );
  TestValidator.equals(
    "admin display name matches",
    retrievedAdmin.displayName,
    admin2Authorized.displayName,
  );
  TestValidator.equals(
    "admin grade matches",
    retrievedAdmin.grade,
    admin2Authorized.grade,
  );
  // 5. Validate status field structure (response includes status field)
  TestValidator.predicate(
    "status field is string type",
    typeof retrievedAdmin.status === "string",
  );
  TestValidator.equals(
    "status is active (non-suspended)",
    retrievedAdmin.status,
    "active",
  );
  // 6. Confirm deleted_at is null (active accounts are not soft-deleted)
  TestValidator.equals("deleted_at is null", retrievedAdmin.deletedAt, null);
  // 7. Validate timestamps exist and are valid date-time format
  TestValidator.predicate(
    "created_at is valid",
    retrievedAdmin.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid",
    retrievedAdmin.updatedAt !== undefined,
  );
  // 8. Validate response structure completeness (all required fields present)
  typia.assert(retrievedAdmin);
}
