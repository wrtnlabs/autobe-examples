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

export async function test_api_moderation_action_types_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection and authenticate
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "secure_password123",
      href: "http://localhost/admin",
      referrer: "http://localhost/",
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies DeepPartial<
      import("@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin").IDiscussionBoardSuperAdmin.IJoin
    >,
  });
  typia.assert(superAdmin);
  // Create a moderation action type
  const createdActionType =
    await generate_random_discussion_board_super_admin_moderation_action_types_create(
      superAdminConnection,
      {
        body: {
          code: "USER_BAN",
          name: "User Ban",
          description: "Ban a user from the platform",
          category: "user_management",
          severity_level: "high",
          requires_reason: true,
          is_active: true,
        } satisfies DeepPartial<IDiscussionBoardModerationActionType.ICreate>,
      },
    );
  typia.assert(createdActionType);
  // Retrieve the moderation action type using GET endpoint
  const retrievedActionType =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.at(
      superAdminConnection,
      {
        typeId: createdActionType.id,
      },
    );
  typia.assert(retrievedActionType);
  // Validate that retrieved data matches created data
  TestValidator.equals(
    "moderation action type id",
    retrievedActionType.id,
    createdActionType.id,
  );
  TestValidator.equals(
    "moderation action type code",
    retrievedActionType.code,
    createdActionType.code,
  );
  TestValidator.equals(
    "moderation action type name",
    retrievedActionType.name,
    createdActionType.name,
  );
  TestValidator.equals(
    "moderation action type description",
    retrievedActionType.description,
    createdActionType.description,
  );
  TestValidator.equals(
    "moderation action type category",
    retrievedActionType.category,
    createdActionType.category,
  );
  TestValidator.equals(
    "moderation action type severity level",
    retrievedActionType.severity_level,
    createdActionType.severity_level,
  );
  TestValidator.equals(
    "moderation action type requires reason",
    retrievedActionType.requires_reason,
    createdActionType.requires_reason,
  );
  TestValidator.equals(
    "moderation action type is active",
    retrievedActionType.is_active,
    createdActionType.is_active,
  );
  TestValidator.equals(
    "moderation action type created at",
    retrievedActionType.created_at,
    createdActionType.created_at,
  );
  TestValidator.equals(
    "moderation action type updated at",
    retrievedActionType.updated_at,
    createdActionType.updated_at,
  );
}
