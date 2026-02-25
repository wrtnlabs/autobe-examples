import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionApproval";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_promotion_analytics_empty_results_edge_cases(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  
  // Test 1: Far future date range (no data should exist)
  const futureAnalytics = await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
    superAdminConnection,
    {
      body: {
        created_from: new Date("2100-01-01T00:00:00.000Z").toISOString(),
        created_to: new Date("2100-12-31T23:59:59.999Z").toISOString(),
      } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
    },
  );
  typia.assert(futureAnalytics);
  TestValidator.equals(
    "future analytics empty data",
    futureAnalytics.data.length,
    0,
  );
  
  // Test 2: Far past date range (no data should exist)
  const pastAnalytics = await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
    superAdminConnection,
    {
      body: {
        created_from: new Date("1900-01-01T00:00:00.000Z").toISOString(),
        created_to: new Date("1900-12-31T23:59:59.999Z").toISOString(),
      } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
    },
  );
  typia.assert(pastAnalytics);
  TestValidator.equals(
    "past analytics empty data",
    pastAnalytics.data.length,
    0,
  );
  
  // Test 3: Conflicting filters (approved status with future approval date)
  const conflictingAnalytics = await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
    superAdminConnection,
    {
      body: {
        status: "approved" as const,
        approved_from: new Date("2100-01-01T00:00:00.000Z").toISOString(),
      } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
    },
  );
  typia.assert(conflictingAnalytics);
  TestValidator.equals(
    "conflicting analytics empty data",
    conflictingAnalytics.data.length,
    0,
  );
  
  // Test 4: Minimum limit value
  const minLimitAnalytics = await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
    superAdminConnection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
    },
  );
  typia.assert(minLimitAnalytics);
  
  // Test 5: Maximum limit value
  const maxLimitAnalytics = await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
    superAdminConnection,
    {
      body: {
        limit: typia.random<
          number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
        >(),
      } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
    },
  );
  typia.assert(maxLimitAnalytics);
  
  // Test 6: Search term that matches nothing
  const searchAnalytics = await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
    superAdminConnection,
    {
      body: {
        search: "nonexistent_search_term_that_wont_match_anything",
      } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
    },
  );
  typia.assert(searchAnalytics);
  TestValidator.equals(
    "search analytics empty data",
    searchAnalytics.data.length,
    0,
  );
  
  // Test 7: All optional parameters set to null
  const nullAnalytics = await api.functional.discussionBoard.superAdmin.promotion_analytics.index(
    superAdminConnection,
    {
      body: {
        status: null,
        search: undefined,
        created_from: null,
        created_to: null,
        approved_from: null,
        approved_to: null,
        rejected_from: null,
        rejected_to: null,
        page: undefined,
        limit: undefined,
      } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
    },
  );
  typia.assert(nullAnalytics);
}