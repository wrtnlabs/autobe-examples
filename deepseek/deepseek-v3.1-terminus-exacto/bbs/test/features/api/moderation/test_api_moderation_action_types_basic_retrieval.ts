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

export async function test_api_moderation_action_types_basic_retrieval(
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
  // Call moderation action types endpoint with default pagination
  const response =
    await api.functional.discussionBoard.superAdmin.analytics.moderation_action_types.index(
      superAdminConnection,
      {
        body: {
          // Use minimal/default parameters for basic retrieval
        } satisfies IDiscussionBoardModerationActionType.IRequest,
      },
    );
  // Validate response structure - typia.assert performs complete validation
  typia.assert(response);
  // Validate pagination business logic (not type validation)
  TestValidator.predicate(
    "current page should be 1 with default parameters",
    response.pagination.current === 1,
  );
  TestValidator.predicate(
    "limit should be positive",
    response.pagination.limit > 0,
  );
  TestValidator.predicate(
    "records count should match total available",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages calculation should be correct",
    response.pagination.pages ===
      Math.ceil(response.pagination.records / response.pagination.limit) ||
      (response.pagination.records === 0 && response.pagination.pages === 0),
  );
  TestValidator.predicate(
    "data array length should not exceed limit",
    response.data.length <= response.pagination.limit,
  );
  // Validate each moderation action type summary
  for (const item of response.data) {
    // typia.assert performs complete validation including all required fields
    typia.assert(item);
    // Business logic validation only
    TestValidator.predicate(
      "moderation action type should have non-empty code",
      item.code.length > 0,
    );
    TestValidator.predicate(
      "moderation action type should have non-empty name",
      item.name.length > 0,
    );
  }
}
