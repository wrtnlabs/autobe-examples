import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
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

export async function test_api_moderation_action_type_update_partial_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Since there's no create endpoint for moderation action types, we need to use
  // a valid existing action type ID. In a real scenario, this would come from
  // a pre-populated database or a separate create operation.
  // For testing purposes, we'll use a randomly generated UUID that represents
  // an existing action type in the test environment.
  const existingActionTypeId = typia.random<string & tags.Format<"uuid">>();
  // Update partial fields of the existing moderation action type
  const updateBody: IDiscussionBoardModerationActionType.IUpdate = {
    name: "Updated Action Name",
    description: "Updated description with more details",
    severity_level: "high",
    requires_reason: true,
  };
  const updatedActionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.update(
      superAdminConnection,
      {
        actionTypeId: existingActionTypeId,
        body: updateBody,
      },
    );
  typia.assert(updatedActionType);
  // Validate the updated fields
  TestValidator.equals(
    "name should be updated",
    updatedActionType.name,
    "Updated Action Name",
  );
  TestValidator.equals(
    "description should be updated",
    updatedActionType.description,
    "Updated description with more details",
  );
  TestValidator.equals(
    "severity level should be updated",
    updatedActionType.severityLevel,
    "high",
  );
  TestValidator.equals(
    "requires reason should be updated",
    updatedActionType.requiresReason,
    true,
  );
  // Validate the action type ID matches the one we updated
  TestValidator.equals(
    "id should match the updated action type",
    updatedActionType.id,
    existingActionTypeId,
  );
  // Validate timestamp was updated (should be a valid date)
  TestValidator.predicate(
    "updatedAt should be valid date",
    () => !isNaN(new Date(updatedActionType.updatedAt).getTime()),
  );
  TestValidator.predicate(
    "createdAt should be valid date",
    () => !isNaN(new Date(updatedActionType.createdAt).getTime()),
  );
  // Validate all required fields are present in the response
  TestValidator.predicate(
    "should have code field",
    () => typeof updatedActionType.code === "string",
  );
  TestValidator.predicate(
    "should have isActive field",
    () => typeof updatedActionType.isActive === "boolean",
  );
}
