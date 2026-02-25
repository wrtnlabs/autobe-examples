import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_admin_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Join as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await api.functional.discussionBoard.auth.superAdmin.join(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "Test1234!@#$",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  // Use the authenticated connection to retrieve an admin profile
  // The scenario indicates we should be able to retrieve an admin profile
  // We'll use a known admin UUID for testing purposes
  const adminId = "00000000-0000-0000-0000-000000000001";
  // Act: Retrieve admin profile
  const adminProfile =
    await api.functional.discussionBoard.superAdmin.admins.at(
      superAdminConnection,
      { adminId },
    );
  // Assert: Verify the admin profile structure and values
  typia.assert(adminProfile);
  // Validate expected fields exist and have correct types
  TestValidator.predicate(
    "admin has valid id",
    () => adminProfile.id !== null && adminProfile.id !== undefined,
  );
  TestValidator.predicate(
    "admin has display_name",
    () =>
      adminProfile.display_name !== null &&
      adminProfile.display_name !== undefined,
  );
  TestValidator.predicate(
    "admin has email",
    () => adminProfile.email !== null && adminProfile.email !== undefined,
  );
  TestValidator.equals(
    "admin is not super admin",
    adminProfile.is_super_admin,
    false,
  );
  TestValidator.equals("admin is active", adminProfile.is_active, true);
  TestValidator.predicate(
    "created_at is valid date-time",
    () =>
      adminProfile.created_at !== null && adminProfile.created_at !== undefined,
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    () =>
      adminProfile.updated_at !== null && adminProfile.updated_at !== undefined,
  );
  TestValidator.predicate(
    "deleted_at is valid (nullable)",
    () =>
      adminProfile.deleted_at === null || adminProfile.deleted_at !== undefined,
  );
  TestValidator.predicate(
    "promoted_by_id is valid (nullable)",
    () =>
      adminProfile.promoted_by_id === null ||
      adminProfile.promoted_by_id !== undefined,
  );
}
