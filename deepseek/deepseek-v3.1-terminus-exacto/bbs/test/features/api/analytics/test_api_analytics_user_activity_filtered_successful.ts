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

/**
 * Test analytics endpoint with comprehensive filtering capabilities.
 *
 * 1. Admin authentication and connection setup
 * 2. Generate comprehensive filter criteria with specific activity types, date ranges, success status
 * 3. Test pagination parameters with filtered results
 * 4. Validate response structure and actor identity resolution
 * 5. Test edge cases with minimal filters
 */
export async function test_api_analytics_user_activity_filtered_successful(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication setup
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Test with comprehensive filtering
  const comprehensiveRequest = {
    activity_type: "article_create",
    success_status: true,
    created_at_from: new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString(),
    created_at_to: new Date().toISOString(),
    page: 1,
    limit: 10,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const comprehensiveResponse =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      { body: comprehensiveRequest },
    );
  typia.assert(comprehensiveResponse);
  // Validate pagination structure exists
  TestValidator.predicate(
    "pagination exists",
    comprehensiveResponse.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(comprehensiveResponse.data),
  );
  // 3. Test pagination parameters work without errors
  const paginationRequest = {
    page: 2,
    limit: 5,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const paginationResponse =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      { body: paginationRequest },
    );
  typia.assert(paginationResponse);
  // Validate that pagination response has expected structure
  TestValidator.predicate(
    "pagination response valid",
    paginationResponse.pagination !== undefined &&
      Array.isArray(paginationResponse.data),
  );
  // 4. Test minimal filtering (empty combinations)
  const minimalRequest = {
    page: 1,
    limit: 20,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const minimalResponse =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      { body: minimalRequest },
    );
  typia.assert(minimalResponse);
  // Validate that empty filters return data
  TestValidator.predicate(
    "minimal request returns valid response",
    minimalResponse.pagination !== undefined &&
      Array.isArray(minimalResponse.data),
  );
  // 5. Test actor identity resolution in response data
  if (comprehensiveResponse.data.length > 0) {
    const sampleActivity = comprehensiveResponse.data[0];
    // Validate that actor identities are properly resolved through JOIN operations
    TestValidator.predicate(
      "activity has valid structure",
      sampleActivity.id !== undefined &&
        sampleActivity.activity_type !== undefined &&
        sampleActivity.created_at !== undefined,
    );
    // Actor identity fields should be present (may be null for system activities)
    TestValidator.predicate(
      "actor fields exist",
      sampleActivity.user !== undefined &&
        sampleActivity.admin !== undefined &&
        sampleActivity.superAdmin !== undefined,
    );
  }
  // 6. Test user role filtering
  const userRoleRequest = {
    admin_id: admin.id,
    success_status: true,
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const userRoleResponse =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      { body: userRoleRequest },
    );
  typia.assert(userRoleResponse);
  // 7. Test success_status filtering
  const successStatusRequest = {
    success_status: false,
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const successStatusResponse =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      { body: successStatusRequest },
    );
  typia.assert(successStatusResponse);
  // 8. Test target entity filtering
  const targetEntityRequest = {
    target_entity_type: "article",
    page: 1,
    limit: 5,
  } satisfies IDiscussionBoardSystemActivity.IRequest;
  const targetEntityResponse =
    await api.functional.discussionBoard.admin.analytics.user_activity.index(
      adminConnection,
      { body: targetEntityRequest },
    );
  typia.assert(targetEntityResponse);
}
