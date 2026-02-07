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
import { generate_random_discussion_board_super_admin_moderation_action_types_create } from "../../../generate/generate_random_discussion_board_super_admin_moderation_action_types_create";
import { prepare_random_discussion_board_moderation_action_type } from "../../../prepare/prepare_random_discussion_board_moderation_action_type";

export async function test_api_moderation_action_type_creation_with_optional_fields(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Create moderation action type with all optional fields populated
  const createBody = {
    code: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    category: "content",
    severity_level: "medium",
    requires_reason: true,
    is_active: true,
  } satisfies IDiscussionBoardModerationActionType.ICreate;
  // Create the moderation action type using utility function
  const actionType =
    await generate_random_discussion_board_super_admin_moderation_action_types_create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(actionType);
  // Validate that all optional fields are properly stored and returned
  TestValidator.equals(
    "category matches",
    actionType.category,
    createBody.category,
  );
  TestValidator.equals(
    "severity level matches",
    actionType.severityLevel,
    createBody.severity_level,
  );
  TestValidator.equals(
    "requires reason matches",
    actionType.requiresReason,
    createBody.requires_reason,
  );
  TestValidator.equals(
    "is active matches",
    actionType.isActive,
    createBody.is_active,
  );
  // Validate required fields
  TestValidator.equals("code matches", actionType.code, createBody.code);
  TestValidator.equals("name matches", actionType.name, createBody.name);
  TestValidator.equals(
    "description matches",
    actionType.description,
    createBody.description,
  );
  // Validate system-generated fields
  TestValidator.predicate(
    "has valid UUID",
    /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      actionType.id,
    ),
  );
  TestValidator.predicate(
    "has creation timestamp",
    actionType.createdAt !== undefined,
  );
  TestValidator.predicate(
    "has update timestamp",
    actionType.updatedAt !== undefined,
  );
}
