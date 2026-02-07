import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardModerationActionType";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardModerationActionType } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardModerationActionType";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_moderation_action_types_search_all_active(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      privilege_level: "super_admin",
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // Call moderation action types endpoint with is_active filter to get only active types
  const response =
    await api.functional.discussionBoard.superAdmin.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          is_active: true,
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination structure
  TestValidator.equals(
    "pagination structure valid",
    typeof response.pagination,
    "object",
  );
  TestValidator.predicate(
    "current page valid",
    response.pagination.current >= 0,
  );
  TestValidator.predicate("limit valid", response.pagination.limit >= 0);
  TestValidator.predicate(
    "records count valid",
    response.pagination.records >= 0,
  );
  TestValidator.predicate("pages count valid", response.pagination.pages >= 0);
  // Validate data array contains moderation action types
  TestValidator.equals("data is array", Array.isArray(response.data), true);
  // Validate that we received active moderation action types
  if (response.data.length > 0) {
    TestValidator.predicate(
      "has active moderation types",
      response.data.length > 0,
    );
    // typia.assert already validated all types, so we can trust the structure
    // Just verify business logic that all returned types are indeed active
    for (const actionType of response.data) {
      TestValidator.predicate(
        "moderation action type is active",
        actionType.is_active === true,
      );
    }
  }
}
