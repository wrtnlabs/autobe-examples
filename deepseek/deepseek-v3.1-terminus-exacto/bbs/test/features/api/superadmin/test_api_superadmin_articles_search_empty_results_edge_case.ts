import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardArticle";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_articles_search_empty_results_edge_case(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator
  const authorized = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardSuperAdmin.IJoin,
  });
  typia.assert(authorized);
  // Update connection with authorization token
  superAdminConnection.headers = {
    ...superAdminConnection.headers,
    Authorization: authorized.token.access,
  };
  // Create search criteria that is valid but unlikely to match any articles
  const searchCriteria = {
    created_at_start: new Date(Date.UTC(2000, 0, 1)).toISOString(), // Distant past
    created_at_end: new Date(Date.UTC(2001, 0, 1)).toISOString(), // Distant past +1 year
    title: RandomGenerator.alphaNumeric(32) + "_highly_unlikely_to_match",
    page: 1,
    limit: 50,
  } satisfies IDiscussionBoardArticle.IRequest;
  // Execute search with criteria that should yield empty results
  const result = await api.functional.discussionBoard.superAdmin.articles.index(
    superAdminConnection,
    { body: searchCriteria },
  );
  typia.assert(result);
  // The pagination structure has multiple nested layers. Looking at the DTO definitions,
  // the actual pagination properties are deeply nested. Based on the type chain:
  // IPageIDiscussionBoardArticle.ISummary -> IPageIDiscussionBoardSection.IPagination ->
  // IPageIDiscussionBoardAdministratorPromotionRequest.IPagination ->
  // IPageIDiscussionBoardAdministratorDistributionStatistic.IPagination ->
  // IPage.IPagination
  // Therefore, the correct property access is:
  const pagination = result.pagination.pagination.pagination.pagination;
  // Validate pagination metadata for empty results
  TestValidator.equals("current page should be 1", pagination.current, 1);
  TestValidator.equals("limit should be 50", pagination.limit, 50);
  TestValidator.equals("total records should be 0", pagination.records, 0);
  // Validate empty data array
  TestValidator.equals("data array should be empty", result.data.length, 0);
}
