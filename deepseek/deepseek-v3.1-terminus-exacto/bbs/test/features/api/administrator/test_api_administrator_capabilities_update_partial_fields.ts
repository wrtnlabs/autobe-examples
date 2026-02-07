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

export async function test_api_administrator_capabilities_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection using available utility function
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
  // 2. Create regular administrator account
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
  // 3. Create initial capability assignment with specific values
  const initialCapabilityType = "content_moderation";
  const initialPermissionLevel = "read_only";
  // First call creates the capability assignment
  const initialResult =
    await api.functional.discussionBoard.admin.administrators.capabilities.updateCapabilities(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: {
          capability_type: initialCapabilityType,
          permission_level: initialPermissionLevel,
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(initialResult);
  // Verify initial assignment was created
  TestValidator.equals(
    "should have capability created",
    initialResult.data.length,
    1,
  );
  const originalCapability = initialResult.data[0];
  TestValidator.equals(
    "initial capability type",
    originalCapability.capability_type,
    initialCapabilityType,
  );
  TestValidator.equals(
    "initial permission level",
    originalCapability.permission_level,
    initialPermissionLevel,
  );
  // 4. Perform partial update - change only permission level, keep capability_type unchanged
  const updatedPermissionLevel = "full_access";
  const partialUpdateResult =
    await api.functional.discussionBoard.admin.administrators.capabilities.updateCapabilities(
      superAdminConnection,
      {
        administratorId: regularAdmin.id,
        body: {
          permission_level: updatedPermissionLevel,
          // capability_type is intentionally omitted to test partial update
        } satisfies IDiscussionBoardAdministratorCapability.IUpdate,
      },
    );
  typia.assert(partialUpdateResult);
  // 5. Validate partial update results
  TestValidator.equals(
    "should still have one capability",
    partialUpdateResult.data.length,
    1,
  );
  const updatedCapability = partialUpdateResult.data[0];
  // Verify capability type remains unchanged (partial update test)
  TestValidator.equals(
    "capability type unchanged after partial update",
    updatedCapability.capability_type,
    initialCapabilityType,
  );
  // Verify permission level was updated
  TestValidator.equals(
    "permission level updated",
    updatedCapability.permission_level,
    updatedPermissionLevel,
  );
  TestValidator.notEquals(
    "permission level changed from initial",
    updatedCapability.permission_level,
    initialPermissionLevel,
  );
  // 6. Verify audit trail shows update occurred
  TestValidator.equals(
    "capability ID remains the same",
    updatedCapability.id,
    originalCapability.id,
  );
  TestValidator.equals(
    "assigned by super admin",
    updatedCapability.assigned_by.id,
    superAdmin.id,
  );
  TestValidator.equals(
    "administrator target remains",
    updatedCapability.administrator.id,
    regularAdmin.id,
  );
  // Verify update timestamp reflects the change
  TestValidator.predicate(
    "updated_at should be after original created_at",
    new Date(updatedCapability.updated_at) >
      new Date(originalCapability.created_at),
  );
}
