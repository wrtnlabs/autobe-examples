import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import type { IDiscussionBoardAdministratorCapabilityAssignItem } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapabilityAssignItem";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
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

/**
 * Test updating existing capability assignments by modifying permission levels.
 * This scenario validates that when assigning a capability type that already exists
 * for the administrator, the system updates the permission level rather than creating
 * a duplicate assignment. Verify that the updated_at timestamp reflects the
 * modification and that the assigned_by field remains unchanged from the original
 * assignment.
 */
export async function test_api_administrator_capability_assignment_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_join(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "superadmin123",
        privilege_level: "super_admin",
      } satisfies IDiscussionBoardSuperAdmin.IJoin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create target administrator account
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // 3. Assign initial capability
  const initialCapabilities: IDiscussionBoardAdministratorCapability.IAssign = {
    capabilities: [
      {
        capability_type: "content_moderation",
        permission_level: "read_only",
      } satisfies IDiscussionBoardAdministratorCapabilityAssignItem,
    ],
  };
  const initialAssignment =
    await api.functional.discussionBoard.superAdmin.capabilities.assign(
      superAdminConnection,
      {
        administratorId: adminAuth.id,
        body: initialCapabilities,
      },
    );
  typia.assert(initialAssignment);
  // Store original assignment metadata for comparison
  const originalId = initialAssignment.id;
  const originalAssignedBy = initialAssignment.assignedBy;
  const originalCreatedAt = initialAssignment.createdAt;
  // 4. Update existing capability with different permission level
  const updatedCapabilities: IDiscussionBoardAdministratorCapability.IAssign = {
    capabilities: [
      {
        capability_type: "content_moderation", // Same capability type
        permission_level: "full_access", // Different permission level
      } satisfies IDiscussionBoardAdministratorCapabilityAssignItem,
    ],
  };
  const updatedAssignment =
    await api.functional.discussionBoard.superAdmin.capabilities.assign(
      superAdminConnection,
      {
        administratorId: adminAuth.id,
        body: updatedCapabilities,
      },
    );
  typia.assert(updatedAssignment);
  // 5. Verify the capability was updated (not duplicated)
  TestValidator.equals(
    "capability ID remains the same",
    updatedAssignment.id,
    originalId,
  );
  TestValidator.equals(
    "capability type remains the same",
    updatedAssignment.capabilityType,
    "content_moderation",
  );
  TestValidator.equals(
    "permission level was updated",
    updatedAssignment.permissionLevel,
    "full_access",
  );
  TestValidator.notEquals(
    "updated_at timestamp changed",
    updatedAssignment.updatedAt,
    originalCreatedAt,
  );
  TestValidator.equals(
    "assigned_by ID remains unchanged",
    updatedAssignment.assignedBy.id,
    originalAssignedBy.id,
  );
  // Additional validation: Ensure update occurred
  TestValidator.predicate(
    "updated_at is after created_at",
    new Date(updatedAssignment.updatedAt) > new Date(originalCreatedAt),
  );
}