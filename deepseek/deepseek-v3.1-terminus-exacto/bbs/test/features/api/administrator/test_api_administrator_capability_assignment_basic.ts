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
 * Test the basic capability assignment workflow where a super administrator assigns
 * a single capability to a regular administrator. Validates that the capability
 * assignment is properly recorded, appears in the response, and includes the
 * assigning super administrator's information in the audit trail.
 */
export async function test_api_administrator_capability_assignment_basic(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "superadmin123",
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // 2. Create and authenticate regular administrator
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 3. Assign a single capability to the regular administrator
  const capabilityAssignment =
    await api.functional.discussionBoard.superAdmin.capabilities.assign(
      superAdminConnection,
      {
        administratorId: admin.id,
        body: {
          capabilities: [
            {
              capability_type: "content_moderation",
              permission_level: "full_access",
            } satisfies IDiscussionBoardAdministratorCapabilityAssignItem,
          ],
        } satisfies IDiscussionBoardAdministratorCapability.IAssign,
      },
    );
  typia.assert(capabilityAssignment);
  // 4. Validate the assignment response
  TestValidator.equals(
    "capability type",
    capabilityAssignment.capabilityType,
    "content_moderation",
  );
  TestValidator.equals(
    "permission level",
    capabilityAssignment.permissionLevel,
    "full_access",
  );
  TestValidator.equals(
    "assigned by admin ID",
    capabilityAssignment.assignedBy.id,
    superAdmin.id,
  );
  TestValidator.predicate(
    "assigned by has valid structure",
    capabilityAssignment.assignedBy.user.display_name !== undefined &&
      capabilityAssignment.assignedBy.user.created_at !== undefined,
  );
  TestValidator.predicate(
    "created at timestamp valid",
    capabilityAssignment.createdAt !== null,
  );
  TestValidator.predicate(
    "updated at timestamp valid",
    capabilityAssignment.updatedAt !== null,
  );
  TestValidator.equals("not deleted", capabilityAssignment.deletedAt, null);
}
