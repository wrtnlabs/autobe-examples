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

export async function test_api_moderation_action_type_successful_deletion_by_super_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(superAdmin);
  // Step 2: Create a moderation action type
  const actionType =
    await generate_random_discussion_board_super_admin_moderation_action_types_create(
      superAdminConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(10),
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          category: "content_moderation",
          severity_level: "medium",
          requires_reason: true,
          is_active: true,
        } satisfies IDiscussionBoardModerationActionType.ICreate,
      },
    );
  typia.assert(actionType);
  // Step 3: Delete the moderation action type
  await api.functional.discussionBoard.superAdmin.moderation_action_types.erase(
    superAdminConnection,
    {
      typeId: actionType.id,
    },
  );
  // Step 4: Verify referential integrity - attempting to use deleted type should fail
  await TestValidator.error(
    "deleted action type should not be accessible",
    async () => {
      await generate_random_discussion_board_super_admin_moderation_action_types_create(
        superAdminConnection,
        {
          body: {
            code: actionType.code,
            name: RandomGenerator.name(),
            description: RandomGenerator.paragraph({ sentences: 2 }),
            requires_reason: false,
          } satisfies IDiscussionBoardModerationActionType.ICreate,
        },
      );
    },
  );
}
