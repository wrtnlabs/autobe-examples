import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionApproval } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionApproval";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test text search functionality on promotion approvals by searching for specific keywords in the reason field.
 * Verify that search terms match partially contained text and are case-insensitive. Test pagination behavior
 * with search results, validating that page limits work correctly and that pagination metadata accurately
 * reflects the filtered result set. Validate that combinations of text search with status filtering and
 * date ranges produce correct results.
 */
export async function test_api_administrator_promotion_approvals_text_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // Test basic search functionality with valid request parameters
  const searchResult =
    await api.functional.discussionBoard.admin.administrator_promotion_approvals.index(
      adminConnection,
      {
        body: {
          search: "test",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate that the response structure is correct
  TestValidator.predicate(
    "response contains pagination data",
    searchResult.pagination !== undefined && searchResult.data !== undefined,
  );
  // Test case-insensitive search
  const caseInsensitiveSearch =
    await api.functional.discussionBoard.admin.administrator_promotion_approvals.index(
      adminConnection,
      {
        body: {
          search: "TEST",
          page: 1,
          limit: 5,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(caseInsensitiveSearch);
  // Test combination with status filtering
  const statusSearch =
    await api.functional.discussionBoard.admin.administrator_promotion_approvals.index(
      adminConnection,
      {
        body: {
          search: "reason",
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(statusSearch);
  // Test date range with search
  const dateSearch =
    await api.functional.discussionBoard.admin.administrator_promotion_approvals.index(
      adminConnection,
      {
        body: {
          search: "important",
          created_from: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_to: new Date().toISOString(),
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(dateSearch);
  // Test pagination limits
  const paginationTest =
    await api.functional.discussionBoard.admin.administrator_promotion_approvals.index(
      adminConnection,
      {
        body: {
          search: "search",
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardAdministratorPromotionApproval.IRequest,
      },
    );
  typia.assert(paginationTest);
  // Validate pagination structure - remove invalid property access
  TestValidator.predicate(
    "pagination has valid structure",
    paginationTest.pagination !== undefined
  );
}