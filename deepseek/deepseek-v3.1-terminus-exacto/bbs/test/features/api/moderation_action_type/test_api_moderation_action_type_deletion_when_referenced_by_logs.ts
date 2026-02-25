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

export async function test_api_moderation_action_type_deletion_when_referenced_by_logs(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator and get the authorized connection
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Create a new connection with the updated headers from authorization
  const authenticatedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...superAdminConnection.headers,
      Authorization: authorized.token.access,
    },
  };
  // Create a moderation action type
  const actionType =
    await generate_random_discussion_board_super_admin_moderation_action_types_create(
      authenticatedConnection,
      {
        body: {
          code: RandomGenerator.alphaNumeric(8),
          name: RandomGenerator.paragraph({ sentences: 2 }),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          category: RandomGenerator.pick([
            "content",
            "user",
            "system",
          ] as const),
          severity_level: RandomGenerator.pick([
            "low",
            "medium",
            "high",
          ] as const),
          requires_reason: typia.random<boolean>(),
          is_active: true,
        } satisfies IDiscussionBoardModerationActionType.ICreate,
      },
    );
  typia.assert(actionType);
  // Attempt deletion - should succeed since no moderation logs reference this type
  await api.functional.discussionBoard.superAdmin.moderation_action_types.erase(
    authenticatedConnection,
    {
      typeId: actionType.id,
    },
  );
  // If we reach here without error, deletion succeeded as expected
  // This validates that deletion is allowed when no references exist
}
