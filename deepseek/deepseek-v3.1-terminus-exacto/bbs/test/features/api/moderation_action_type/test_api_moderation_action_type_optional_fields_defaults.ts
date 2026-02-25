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
import { generate_random_discussion_board_super_admin_moderation_action_types_create } from "../../../generate/generate_random_discussion_board_super_admin_moderation_action_types_create";
import { prepare_random_discussion_board_moderation_action_type } from "../../../prepare/prepare_random_discussion_board_moderation_action_type";

export async function test_api_moderation_action_type_optional_fields_defaults(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super admin (join since no login utility provided)
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Create moderation action type with only required fields
  const createBody = {
    code: RandomGenerator.alphabets(10),
    name: RandomGenerator.name(2),
    description: RandomGenerator.paragraph({ sentences: 3 }),
    requires_reason: typia.random<boolean>(),
    // Omit category, severity_level, and is_active to test defaults
  } satisfies IDiscussionBoardModerationActionType.ICreate;
  const actionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(actionType);
  // Verify system defaults are applied
  TestValidator.equals("category defaults to null", actionType.category, null);
  TestValidator.equals(
    "severity_level defaults to null",
    actionType.severity_level,
    null,
  );
  TestValidator.equals(
    "is_active defaults to true",
    actionType.is_active,
    true,
  );
  // Verify required fields match input
  TestValidator.equals("code matches input", actionType.code, createBody.code);
  TestValidator.equals("name matches input", actionType.name, createBody.name);
  TestValidator.equals(
    "description matches input",
    actionType.description,
    createBody.description,
  );
  TestValidator.equals(
    "requires_reason matches input",
    actionType.requires_reason,
    createBody.requires_reason,
  );
}
