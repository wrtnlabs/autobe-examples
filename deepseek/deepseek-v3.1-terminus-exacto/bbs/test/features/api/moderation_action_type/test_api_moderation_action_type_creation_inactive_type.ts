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

export async function test_api_moderation_action_type_creation_inactive_type(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Create an inactive moderation action type
  const actionType =
    await generate_random_discussion_board_super_admin_moderation_action_types_create(
      superAdminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category: "content",
          severity_level: "medium",
          requires_reason: true,
          is_active: false,
        } satisfies IDiscussionBoardModerationActionType.ICreate,
      },
    );
  typia.assert(actionType);
  // Validate the created action type properties
  TestValidator.equals("id is generated", typeof actionType.id, "string");
  TestValidator.predicate(
    "id is valid uuid",
    /^[0-9a-f-]{36}$/i.test(actionType.id),
  );
  TestValidator.equals("code matches input", actionType.code.length > 0, true);
  TestValidator.equals("name matches input", actionType.name.length > 0, true);
  TestValidator.equals(
    "description matches input",
    actionType.description.length > 0,
    true,
  );
  TestValidator.equals(
    "category matches input",
    actionType.category,
    "content",
  );
  TestValidator.equals(
    "severity level matches input",
    actionType.severityLevel,
    "medium",
  );
  TestValidator.equals(
    "requires reason matches input",
    actionType.requiresReason,
    true,
  );
  TestValidator.equals("is active is false", actionType.isActive, false);
  TestValidator.predicate(
    "created at is valid date",
    !isNaN(new Date(actionType.createdAt).getTime()),
  );
  TestValidator.predicate(
    "updated at is valid date",
    !isNaN(new Date(actionType.updatedAt).getTime()),
  );
}
