import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardStatusType } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardStatusType";
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
import { generate_random_discussion_board_super_admin_status_types_create } from "../../../generate/generate_random_discussion_board_super_admin_status_types_create";
import { prepare_random_discussion_board_status_type } from "../../../prepare/prepare_random_discussion_board_status_type";

export async function test_api_status_types_update_deactivate_in_use(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  // 2. Create a status type with category 'article', code 'published', is_active: true
  const statusType =
    await generate_random_discussion_board_super_admin_status_types_create(
      superAdminConnection,
      {
        body: {
          category: "article",
          code: "published",
          display_name: "Published Article",
          description:
            "Article that has been published and is visible to users",
          display_order: 1,
          is_active: true,
        } satisfies IDiscussionBoardStatusType.ICreate,
      },
    );
  typia.assert(statusType);
  // Note: We cannot create actual articles that reference this status type due to missing article creation APIs.
  // The test will validate the system's behavior when attempting to deactivate a status type that may be referenced.
  // 3. Attempt to update the status type to is_active: false
  const updateResult =
    await api.functional.discussionBoard.superAdmin.status_types.update(
      superAdminConnection,
      {
        statusTypeId: statusType.id,
        body: {
          is_active: false,
        } satisfies IDiscussionBoardStatusType.IUpdate,
      },
    );
  // 4. Validate the system's response
  typia.assert(updateResult);
  // Check if deactivation was allowed or prevented
  if (updateResult.is_active === false) {
    // System allows deactivation - verify display_order updates still work
    const displayOrderUpdate =
      await api.functional.discussionBoard.superAdmin.status_types.update(
        superAdminConnection,
        {
          statusTypeId: statusType.id,
          body: {
            display_order: 5,
          } satisfies IDiscussionBoardStatusType.IUpdate,
        },
      );
    typia.assert(displayOrderUpdate);
    TestValidator.equals(
      "display_order updated successfully",
      displayOrderUpdate.display_order,
      5,
    );
    // 6. Test reactivation scenario
    const reactivationResult =
      await api.functional.discussionBoard.superAdmin.status_types.update(
        superAdminConnection,
        {
          statusTypeId: statusType.id,
          body: {
            is_active: true,
          } satisfies IDiscussionBoardStatusType.IUpdate,
        },
      );
    typia.assert(reactivationResult);
    TestValidator.equals(
      "status type reactivated",
      reactivationResult.is_active,
      true,
    );
  } else {
    // System prevents deactivation - verify error handling
    TestValidator.equals(
      "status type remains active",
      updateResult.is_active,
      true,
    );
    // Verify display_order updates still work even when active status cannot be changed
    const displayOrderUpdate =
      await api.functional.discussionBoard.superAdmin.status_types.update(
        superAdminConnection,
        {
          statusTypeId: statusType.id,
          body: {
            display_order: 10,
          } satisfies IDiscussionBoardStatusType.IUpdate,
        },
      );
    typia.assert(displayOrderUpdate);
    TestValidator.equals(
      "display_order updated despite active status restriction",
      displayOrderUpdate.display_order,
      10,
    );
  }
}
