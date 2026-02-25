import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

export async function test_api_moderation_action_type_update_status_toggle(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const auth = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(auth);
  // Create an initial moderation action type
  const initialActionType = {
    code: "test_status_toggle",
    name: "Test Status Toggle Action",
    description: "Action type for testing status toggle functionality",
    category: "test",
    severity_level: "medium",
    requires_reason: true,
    is_active: true,
  } satisfies IDiscussionBoardModerationActionType.IUpdate;
  // Create the action type by updating a placeholder UUID
  const actionTypeId = typia.random<string & tags.Format<"uuid">>();
  const createdActionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
      superAdminConnection,
      {
        typeId: actionTypeId,
        body: initialActionType,
      },
    );
  typia.assert(createdActionType);
  // Test 1: Deactivate the action type
  const deactivatedActionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
      superAdminConnection,
      {
        typeId: actionTypeId,
        body: {
          is_active: false,
        } satisfies IDiscussionBoardModerationActionType.IUpdate,
      },
    );
  typia.assert(deactivatedActionType);
  TestValidator.equals(
    "action type should be inactive",
    deactivatedActionType.is_active,
    false,
  );
  TestValidator.equals(
    "other properties should remain unchanged",
    deactivatedActionType.requires_reason,
    createdActionType.requires_reason,
  );
  // Test 2: Reactivate the action type
  const reactivatedActionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
      superAdminConnection,
      {
        typeId: actionTypeId,
        body: {
          is_active: true,
        } satisfies IDiscussionBoardModerationActionType.IUpdate,
      },
    );
  typia.assert(reactivatedActionType);
  TestValidator.equals(
    "action type should be active again",
    reactivatedActionType.is_active,
    true,
  );
  // Test 3: Toggle requires_reason to false
  const noReasonActionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
      superAdminConnection,
      {
        typeId: actionTypeId,
        body: {
          requires_reason: false,
        } satisfies IDiscussionBoardModerationActionType.IUpdate,
      },
    );
  typia.assert(noReasonActionType);
  TestValidator.equals(
    "action type should not require reason",
    noReasonActionType.requires_reason,
    false,
  );
  // Test 4: Toggle requires_reason back to true
  const reasonRequiredActionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
      superAdminConnection,
      {
        typeId: actionTypeId,
        body: {
          requires_reason: true,
        } satisfies IDiscussionBoardModerationActionType.IUpdate,
      },
    );
  typia.assert(reasonRequiredActionType);
  TestValidator.equals(
    "action type should require reason again",
    reasonRequiredActionType.requires_reason,
    true,
  );
  // Test 5: Verify final state
  TestValidator.equals(
    "final is_active should be true",
    reasonRequiredActionType.is_active,
    true,
  );
  TestValidator.equals(
    "final requires_reason should be true",
    reasonRequiredActionType.requires_reason,
    true,
  );
  TestValidator.notEquals(
    "updated_at should reflect changes",
    reasonRequiredActionType.updated_at,
    createdActionType.updated_at,
  );
}
