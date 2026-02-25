import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminHierarchyAction";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdminHierarchyAction } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdminHierarchyAction";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

/**
 * Test filtering administrator hierarchy actions by action type.
 * 1. Authenticate as a user to access the admin hierarchy actions audit trail
 * 2. Query with action_type='PROMOTION' filter
 * 3. Verify all returned records have actionType='PROMOTION'
 * 4. Query with action_type='DEMOTION' filter
 * 5. Verify all returned records have actionType='DEMOTION'
 */
export async function test_api_admin_hierarchy_actions_filter_by_type(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a user
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {});
  // 2. Query with action_type='PROMOTION' filter
  const promotionResponse =
    await api.functional.discussionBoard.user.adminHierarchyActions.index(
      userConnection,
      {
        body: {
          action_type: "PROMOTION",
        } satisfies IDiscussionBoardAdminHierarchyAction.IRequest,
      },
    );
  typia.assert(promotionResponse);
  // 3. Verify all returned records have actionType='PROMOTION'
  for (const action of promotionResponse.data) {
    TestValidator.equals(
      "action type is PROMOTION",
      action.actionType,
      "PROMOTION",
    );
  }
  // 4. Query with action_type='DEMOTION' filter
  const demotionResponse =
    await api.functional.discussionBoard.user.adminHierarchyActions.index(
      userConnection,
      {
        body: {
          action_type: "DEMOTION",
        } satisfies IDiscussionBoardAdminHierarchyAction.IRequest,
      },
    );
  typia.assert(demotionResponse);
  // 5. Verify all returned records have actionType='DEMOTION'
  for (const action of demotionResponse.data) {
    TestValidator.equals(
      "action type is DEMOTION",
      action.actionType,
      "DEMOTION",
    );
  }
  // 6. Verify no cross-contamination between filter types
  const promotionIds = promotionResponse.data.map((a) => a.id);
  const demotionIds = demotionResponse.data.map((a) => a.id);
  for (const promotionId of promotionIds) {
    TestValidator.predicate(
      "PROMOTION records not in DEMOTION results",
      !demotionIds.includes(promotionId),
    );
  }
}
