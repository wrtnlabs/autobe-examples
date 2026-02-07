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

export async function test_api_administrator_capability_assignment_multiple(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create target administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  const targetAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(targetAdmin);
  // Create a dedicated connection for the capability assignment operation
  const capabilityConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_login(capabilityConnection, {
    body: {
      email: superAdmin.email,
      password: superAdmin.token.access, // Use the token from join
    } satisfies IDiscussionBoardSuperAdmin.ILogin,
  });
  // Define the capabilities to assign
  const capabilitiesToAssign: IDiscussionBoardAdministratorCapabilityAssignItem[] =
    [
      {
        capability_type: "content_moderation",
        permission_level: "full_access",
      } satisfies IDiscussionBoardAdministratorCapabilityAssignItem,
      {
        capability_type: "user_management",
        permission_level: "limited_scope",
      } satisfies IDiscussionBoardAdministratorCapabilityAssignItem,
      {
        capability_type: "section_admin",
        permission_level: "read_only",
      } satisfies IDiscussionBoardAdministratorCapabilityAssignItem,
    ];
  // Assign multiple capabilities with different permission levels
  const assignedCapabilities =
    await api.functional.discussionBoard.superAdmin.capabilities.assign(
      capabilityConnection,
      {
        administratorId: targetAdmin.id,
        body: {
          capabilities: capabilitiesToAssign,
        } satisfies IDiscussionBoardAdministratorCapability.IAssign,
      },
    );
  typia.assert(assignedCapabilities);
  // Validate the response contains valid timestamps
  TestValidator.predicate("createdAt is valid date", () => {
    const date = new Date(assignedCapabilities.createdAt);
    return !isNaN(date.getTime());
  });
  TestValidator.predicate("updatedAt is valid date", () => {
    const date = new Date(assignedCapabilities.updatedAt);
    return !isNaN(date.getTime());
  });
  // Validate assignedBy references the super administrator
  TestValidator.equals(
    "assignedBy user id matches super admin",
    assignedCapabilities.assignedBy.user.id,
    superAdmin.id,
  );
  // Remove the email validation since ISummary type doesn't have email property
  // Validate the capability type is one of the assigned types
  TestValidator.predicate("capabilityType is valid", () => {
    const validTypes = [
      "content_moderation",
      "user_management",
      "section_admin",
      "system_config",
    ];
    return validTypes.includes(assignedCapabilities.capabilityType);
  });
  // Validate the permission level is valid
  TestValidator.predicate("permissionLevel is valid", () => {
    const validLevels = ["read_only", "full_access", "limited_scope"];
    return validLevels.includes(assignedCapabilities.permissionLevel);
  });
  // Validate that the assigned capability is active
  TestValidator.equals(
    "capability is active",
    assignedCapabilities.assignedBy.is_active,
    true,
  );
}