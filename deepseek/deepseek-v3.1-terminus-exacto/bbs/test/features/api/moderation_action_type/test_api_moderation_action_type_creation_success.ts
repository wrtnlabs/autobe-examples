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

export async function test_api_moderation_action_type_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // 2. Authenticate as super administrator using utility function
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorized);
  // 3. Prepare moderation action type creation data
  const createBody = {
    code: `ACTION_${RandomGenerator.alphabets(8).toUpperCase()}`,
    name: RandomGenerator.name(3),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    category: RandomGenerator.pick(["content", "user", "spam", null] as const),
    severity_level: RandomGenerator.pick([
      "low",
      "medium",
      "high",
      null,
    ] as const),
    requires_reason: true,
    is_active: true,
  } satisfies IDiscussionBoardModerationActionType.ICreate;
  // 4. Create moderation action type using utility function
  const actionType =
    await generate_random_discussion_board_super_admin_moderation_action_types_create(
      superAdminConnection,
      { body: createBody },
    );
  typia.assert(actionType);
  // 5. Validate response fields
  TestValidator.equals("code matches", actionType.code, createBody.code);
  TestValidator.equals("name matches", actionType.name, createBody.name);
  TestValidator.equals(
    "description matches",
    actionType.description,
    createBody.description,
  );
  TestValidator.equals(
    "requires_reason matches",
    actionType.requires_reason,
    createBody.requires_reason,
  );
  TestValidator.equals(
    "is_active matches",
    actionType.is_active,
    createBody.is_active,
  );
  // 6. Validate optional fields if present
  if (createBody.category !== null && createBody.category !== undefined) {
    TestValidator.equals(
      "category matches",
      actionType.category,
      createBody.category,
    );
  } else {
    TestValidator.predicate(
      "category is null or undefined",
      actionType.category === null || actionType.category === undefined,
    );
  }
  if (
    createBody.severity_level !== null &&
    createBody.severity_level !== undefined
  ) {
    TestValidator.equals(
      "severity_level matches",
      actionType.severity_level,
      createBody.severity_level,
    );
  } else {
    TestValidator.predicate(
      "severity_level is null or undefined",
      actionType.severity_level === null ||
        actionType.severity_level === undefined,
    );
  }
}
