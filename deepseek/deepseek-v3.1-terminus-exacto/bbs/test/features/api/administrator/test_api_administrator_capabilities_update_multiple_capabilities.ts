import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorCapability";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorCapability } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorCapability";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrator_capabilities_update_multiple_capabilities(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create regular administrator to update capabilities for
  const regularAdminConnection: api.IConnection = { host: connection.host };
  const regularAdmin = await authorize_admin_join(regularAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(regularAdmin);
  // Test 1: Add new capability - content moderation with full access
  const addCapabilityResponse =
    await api.functional.discussionBoard.admin.administrators.capabilities.updateCapabilities(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: {
          capability_type: "content_moderation",
          permission_level: "full_access",
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(addCapabilityResponse);
  // Validate capability addition
  TestValidator.predicate(
    "capability added successfully",
    addCapabilityResponse.data.length > 0,
  );
  const addedCapability = addCapabilityResponse.data[0];
  TestValidator.equals(
    "capability type matches",
    addedCapability.capability_type,
    "content_moderation",
  );
  TestValidator.equals(
    "permission level matches",
    addedCapability.permission_level,
    "full_access",
  );
  TestValidator.equals(
    "assigned by super admin",
    addedCapability.assigned_by.id,
    superAdmin.id,
  );
  // Test 2: Modify permission level of existing capability
  const modifyCapabilityResponse =
    await api.functional.discussionBoard.admin.administrators.capabilities.updateCapabilities(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: {
          capability_type: "content_moderation",
          permission_level: "read_only",
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(modifyCapabilityResponse);
  // Validate permission level modification
  TestValidator.predicate(
    "capability modified successfully",
    modifyCapabilityResponse.data.length > 0,
  );
  const modifiedCapability = modifyCapabilityResponse.data[0];
  TestValidator.equals(
    "capability type unchanged",
    modifiedCapability.capability_type,
    "content_moderation",
  );
  TestValidator.equals(
    "permission level updated",
    modifiedCapability.permission_level,
    "read_only",
  );
  TestValidator.notEquals(
    "updated_at changed",
    modifiedCapability.updated_at,
    addedCapability.updated_at,
  );
  // Test 3: Add another capability - user management
  const addSecondCapabilityResponse =
    await api.functional.discussionBoard.admin.administrators.capabilities.updateCapabilities(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: {
          capability_type: "user_management",
          permission_level: "limited_scope",
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(addSecondCapabilityResponse);
  // Validate multiple capabilities exist
  TestValidator.predicate(
    "multiple capabilities present",
    addSecondCapabilityResponse.data.length >= 2,
  );
  // Verify both capabilities are present
  const hasContentModeration = addSecondCapabilityResponse.data.some(
    (cap) => cap.capability_type === "content_moderation",
  );
  const hasUserManagement = addSecondCapabilityResponse.data.some(
    (cap) => cap.capability_type === "user_management",
  );
  TestValidator.predicate(
    "content moderation capability exists",
    hasContentModeration,
  );
  TestValidator.predicate(
    "user management capability exists",
    hasUserManagement,
  );
  // Test 4: Verify only super administrators can perform updates
  await TestValidator.error(
    "regular admin cannot update capabilities",
    async () => {
      await api.functional.discussionBoard.admin.administrators.capabilities.updateCapabilities(
        regularAdminConnection,
        {
          administratorId: regularAdmin.id,
          body: {
            capability_type: "section_admin",
            permission_level: "full_access",
          } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
        },
      );
    },
  );
  // Test 5: Verify audit information is properly recorded
  const finalCapabilities =
    await api.functional.discussionBoard.admin.administrators.capabilities.updateCapabilities(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: {
          capability_type: "system_config",
          permission_level: "read_only",
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(finalCapabilities);
  // Validate audit trail for all capabilities
  finalCapabilities.data.forEach((capability, index) => {
    TestValidator.predicate(
      `capability ${index} has valid id`,
      capability.id.length > 0,
    );
    TestValidator.predicate(
      `capability ${index} has valid type`,
      capability.capability_type.length > 0,
    );
    TestValidator.predicate(
      `capability ${index} has valid permission level`,
      capability.permission_level.length > 0,
    );
    TestValidator.equals(
      `capability ${index} assigned by super admin`,
      capability.assigned_by.id,
      superAdmin.id,
    );
    TestValidator.predicate(
      `capability ${index} has creation timestamp`,
      capability.created_at.length > 0,
    );
    TestValidator.predicate(
      `capability ${index} has update timestamp`,
      capability.updated_at.length > 0,
    );
  });
}
