import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
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
import { generate_random_discussion_board_super_admin_administrators_capabilities_create } from "../../../generate/generate_random_discussion_board_super_admin_administrators_capabilities_create";
import { prepare_random_discussion_board_administrator_capability } from "../../../prepare/prepare_random_discussion_board_administrator_capability";

export async function test_api_administrator_capability_different_permission_levels(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Join and authenticate as super admin
  const superAdminAuth =
    await api.functional.discussionBoard.auth.superAdmin.join(
      superAdminConnection,
      {
        body: {
          email: typia.random<string & tags.Format<"email">>(),
          password: RandomGenerator.alphaNumeric(16),
          privilege_level: "super_admin",
        } satisfies IDiscussionBoardSuperAdmin.IJoin,
      },
    );
  typia.assert(superAdminAuth);
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Join and authenticate as admin
  const adminAuth = await api.functional.discussionBoard.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      } satisfies IDiscussionBoardAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Define different permission levels to test
  const permissionLevels = [
    "read_only",
    "full_access",
    "limited_scope",
  ] as const;
  const capabilityTypes = [
    "content_moderation",
    "user_management",
    "section_admin",
  ] as const;
  // Create capability assignments with different permission levels
  const createdCapabilities: IDiscussionBoardAdministratorCapability[] = [];
  for (let i = 0; i < permissionLevels.length; i++) {
    const capability =
      await api.functional.discussionBoard.superAdmin.administrators.capabilities.create(
        superAdminConnection,
        {
          administratorId: adminAuth.id,
          body: {
            capability_type: capabilityTypes[i],
            permission_level: permissionLevels[i],
          } satisfies IDiscussionBoardAdministratorCapability.ICreate,
        },
      );
    typia.assert(capability);
    createdCapabilities.push(capability);
  }
  // Retrieve each capability individually and validate permission levels
  for (let i = 0; i < createdCapabilities.length; i++) {
    const createdCapability = createdCapabilities[i];
    const expectedPermissionLevel = permissionLevels[i];
    const expectedCapabilityType = capabilityTypes[i];
    // Retrieve the capability
    const retrievedCapability =
      await api.functional.discussionBoard.admin.administrators.capabilities.at(
        adminConnection,
        {
          administratorId: adminAuth.id,
          capabilityId: createdCapability.id,
        },
      );
    typia.assert(retrievedCapability);
    // Validate permission level
    TestValidator.equals(
      `permission level should be ${expectedPermissionLevel}`,
      retrievedCapability.permission_level,
      expectedPermissionLevel,
    );
    // Validate capability type
    TestValidator.equals(
      `capability type should be ${expectedCapabilityType}`,
      retrievedCapability.capability_type,
      expectedCapabilityType,
    );
    // Validate assigned_by information
    TestValidator.predicate(
      "assigned_by should be populated",
      retrievedCapability.assigned_by !== null &&
        retrievedCapability.assigned_by.id !== undefined,
    );
    // Validate administrator information
    TestValidator.equals(
      "administrator ID should match",
      retrievedCapability.administrator.id,
      adminAuth.id,
    );
    // Validate timestamps
    TestValidator.predicate(
      "created_at should be valid timestamp",
      retrievedCapability.created_at !== null &&
        retrievedCapability.created_at.length > 0,
    );
    TestValidator.predicate(
      "updated_at should be valid timestamp",
      retrievedCapability.updated_at !== null &&
        retrievedCapability.updated_at.length > 0,
    );
  }
}
