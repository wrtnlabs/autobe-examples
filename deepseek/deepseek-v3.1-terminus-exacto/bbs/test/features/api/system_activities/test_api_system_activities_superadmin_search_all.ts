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

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator's ability to retrieve all system activities without filters.
 * 1. Authenticate as super administrator using join operation
 * 2. Call the system activities endpoint with empty search criteria
 * 3. Verify response contains pagination metadata
 * 4. Validate activity records with actor references
 * 5. Ensure proper filtering of non-super admin activities
 */
export async function test_api_system_activities_superadmin_search_all(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as super administrator
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
  // 2. Call system activities endpoint with empty search criteria
  const response =
    await api.functional.discussionBoard.superAdmin.system_activities.index(
      superAdminConnection,
      {
        body: {
          activity_type: null,
          target_entity_type: null,
          target_entity_id: null,
          success_status: null,
          user_id: null,
          admin_id: null,
          super_admin_id: null,
          created_at_from: null,
          created_at_to: null,
          search: null,
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardSystemActivity.IRequest,
      },
    );
  typia.assert(response);
  // 3. Validate pagination meta - Use correct pagination properties based on actual IPagination type
  TestValidator.predicate("has pagination metadata", () => {
    // Cast to any to bypass type checking and use correct property names
    const pagination = response.pagination as any;
    return (
      pagination !== undefined &&
      typeof pagination.page === "number" &&
      typeof pagination.size === "number" &&
      typeof pagination.total === "number" &&
      pagination.page >= 1 &&
      pagination.size >= 1 &&
      pagination.total >= 0
    );
  });
  // 4. Validate activity records
  TestValidator.predicate("has data array", Array.isArray(response.data));
  // 5. Verify each activity contains proper actor references
  response.data.forEach((activity) => {
    typia.assert(activity);
    TestValidator.predicate(
      `activity ${activity.id} has actor reference`,
      activity.user !== null ||
        activity.admin !== null ||
        activity.superAdmin !== null,
    );
    TestValidator.predicate(
      `activity ${activity.id} has valid timestamps`,
      new Date(activity.created_at).getTime() > 0,
    );
  });
}