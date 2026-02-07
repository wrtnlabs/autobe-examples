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

export async function test_api_moderation_action_type_creation_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Prepare input data
  const inputCode = RandomGenerator.alphaNumeric(8);
  const inputName = RandomGenerator.name();
  const inputDescription = RandomGenerator.paragraph({ sentences: 3 });
  // Create moderation action type
  const actionType =
    await generate_random_discussion_board_super_admin_moderation_action_types_create(
      superAdminConnection,
      {
        body: {
          code: inputCode,
          name: inputName,
          description: inputDescription,
          category: "content",
          severity_level: "medium",
          requires_reason: true,
          is_active: true,
        } satisfies IDiscussionBoardModerationActionType.ICreate,
      },
    );
  typia.assert(actionType);
  // Validate response matches input
  TestValidator.equals("code matches input", actionType.code, inputCode);
  TestValidator.equals("name matches input", actionType.name, inputName);
  TestValidator.equals(
    "description matches input",
    actionType.description,
    inputDescription,
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
  TestValidator.equals("is active matches input", actionType.isActive, true);
}
