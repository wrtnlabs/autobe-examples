import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_discussion_board_user_administrators_promote } from "../../../generate/generate_random_discussion_board_user_administrators_promote";
import { prepare_random_discussion_board_admin_hierarchy_action } from "../../../prepare/prepare_random_discussion_board_admin_hierarchy_action";

/**
 * Test the successful retrieval of an administrator hierarchy action record.
 *
 * This test validates that the GET endpoint for admin hierarchy actions
 * returns a complete IDiscussionBoardAdminHierarchyAction structure with
 * all required fields including nested actor and target user summaries.
 *
 * Test Steps:
 * 1. Create and authenticate a user
 * 2. Retrieve a hierarchy action by ID
 * 3. Validate the complete response structure
 *
 * Note: This test validates the retrieval endpoint's response structure
 * and proper JOIN operations between admin_hierarchy_actions and users tables.
 */
export async function test_api_admin_hierarchy_action_retrieve_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate a user
  const userConnection: api.IConnection = { host: connection.host };
  const actor = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(actor);
  // 2. Retrieve a hierarchy action using a generated UUID
  const hierarchyActionId = typia.random<string & tags.Format<"uuid">>();
  const hierarchyAction =
    await api.functional.discussionBoard.user.adminHierarchyActions.at(
      userConnection,
      {
        adminHierarchyActionId: hierarchyActionId,
      },
    );
  typia.assert(hierarchyAction);
  // 3. Validate response structure - typia.assert validates types completely
  // Business logic validations:
  TestValidator.equals(
    "action type is valid enum value",
    ["PROMOTION", "DEMOTION"].includes(hierarchyAction.action_type),
    true,
  );
  TestValidator.equals(
    "actor ID matches UUID format",
    hierarchyAction.actor.id.length,
    36,
  );
  TestValidator.predicate(
    "actor display name is not empty",
    hierarchyAction.actor.displayName.length > 0,
  );
  TestValidator.predicate(
    "actor email is valid",
    hierarchyAction.actor.email.includes("@"),
  );
  TestValidator.equals(
    "target ID matches UUID format",
    hierarchyAction.target.id.length,
    36,
  );
  TestValidator.predicate(
    "target display name is not empty",
    hierarchyAction.target.displayName.length > 0,
  );
  TestValidator.predicate(
    "target email is valid",
    hierarchyAction.target.email.includes("@"),
  );
  // Validate created_at is a valid ISO datetime
  const createdAtDate = new Date(hierarchyAction.created_at);
  TestValidator.predicate(
    "created_at is valid ISO datetime",
    !isNaN(createdAtDate.getTime()),
  );
  // reason can be null or a string (already validated by typia.assert)
}
