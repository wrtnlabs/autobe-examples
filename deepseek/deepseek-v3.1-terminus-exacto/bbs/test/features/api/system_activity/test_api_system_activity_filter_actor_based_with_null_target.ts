import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSystemActivity";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSystemActivity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSystemActivity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_activity_filter_actor_based_with_null_target(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {});
  typia.assert(adminAuth);
  // 2. Prepare random UUIDs for testing (some may not exist)
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentAdminId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentSuperAdminId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test filtering by user_id only
  const userFilterResponse =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          user_id: nonExistentUserId,
          admin_id: null,
          super_admin_id: null,
          target_entity_type: null,
          target_entity_id: null,
          page: 1 satisfies number,
          limit: 10 satisfies number,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(userFilterResponse);
  TestValidator.equals(
    "user_id filter returns empty when user doesn't exist",
    userFilterResponse.data.length,
    0,
  );
  // 4. Test filtering by admin_id only
  const adminFilterResponse =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          user_id: null,
          admin_id: nonExistentAdminId,
          super_admin_id: null,
          target_entity_type: null,
          target_entity_id: null,
          page: 1 satisfies number,
          limit: 10 satisfies number,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(adminFilterResponse);
  TestValidator.equals(
    "admin_id filter returns empty when admin doesn't exist",
    adminFilterResponse.data.length,
    0,
  );
  // 5. Test filtering by super_admin_id only
  const superAdminFilterResponse =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          user_id: null,
          admin_id: null,
          super_admin_id: nonExistentSuperAdminId,
          target_entity_type: null,
          target_entity_id: null,
          page: 1 satisfies number,
          limit: 10 satisfies number,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(superAdminFilterResponse);
  TestValidator.equals(
    "super_admin_id filter returns empty when super admin doesn't exist",
    superAdminFilterResponse.data.length,
    0,
  );
  // 6. Test filtering with multiple actor IDs simultaneously
  const multiFilterResponse =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          user_id: nonExistentUserId,
          admin_id: nonExistentAdminId,
          super_admin_id: nonExistentSuperAdminId,
          target_entity_type: null,
          target_entity_id: null,
          page: 1 satisfies number,
          limit: 10 satisfies number,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(multiFilterResponse);
  TestValidator.equals(
    "multiple actor filter returns empty when none exist",
    multiFilterResponse.data.length,
    0,
  );
  // 7. Validate pagination structure across all responses
  TestValidator.equals(
    "pagination current page is 1",
    userFilterResponse.pagination.pagination.pagination.pagination.current,
    1 satisfies number,
  );
  TestValidator.equals(
    "pagination limit is 10",
    userFilterResponse.pagination.pagination.pagination.pagination.limit,
    10 satisfies number,
  );
  // 8. Test with no filters (should return some activities likely)
  const noFilterResponse =
    await api.functional.discussionBoard.admin.system_activities.index(
      adminConnection,
      {
        body: {
          user_id: null,
          admin_id: null,
          super_admin_id: null,
          target_entity_type: null,
          target_entity_id: null,
          page: 1 satisfies number,
          limit: 10 satisfies number,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(noFilterResponse);
  // Validate response structure
  TestValidator.predicate(
    "no filter response has valid pagination",
    noFilterResponse.pagination.pagination.pagination.pagination.current >= 0,
  );
  TestValidator.predicate(
    "no filter response has valid data array",
    Array.isArray(noFilterResponse.data),
  );
}
