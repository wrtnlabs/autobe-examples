import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardBanAppeal";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardBanAppeal } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardBanAppeal";
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
 * Test ban appeals status filtering functionality for administrators.
 * Validates that administrators can filter ban appeals by status (pending, under_review, approved, rejected)
 * and that pagination works correctly with filtered results.
 */
export async function test_api_admin_ban_appeals_status_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
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
  // Test each status filter individually
  const statuses = ["pending", "under_review", "approved", "rejected"] as const;
  for (const status of statuses) {
    // Search appeals with specific status filter
    const response = await api.functional.discussionBoard.admin.appeals.index(
      adminConnection,
      {
        body: {
          status,
          page: typia.random<number & tags.Type<"int32"> & tags.Minimum<1>>(),
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies IDiscussionBoardBanAppeal.IRequest,
      },
    );
    typia.assert(response);
    // Validate that all returned appeals match the requested status
    for (const appeal of response.data) {
      TestValidator.equals(
        `appeal ${status} status match`,
        appeal.status,
        status,
      );
    }
    // Validate pagination metadata - FIXED: Use correct pagination property structure
    // The pagination structure is nested: response.pagination.pagination.pagination.pagination
    const pagination = response.pagination.pagination.pagination.pagination;
    TestValidator.predicate(
      `pagination metadata valid for ${status}`,
      pagination.current >= 0 &&
        pagination.records >= 0 &&
        pagination.pages >= 0 &&
        pagination.limit >= 0,
    );
  }
  // Test pagination with status filtering
  const paginationTest =
    await api.functional.discussionBoard.admin.appeals.index(adminConnection, {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(paginationTest);
  // Validate pagination structure - FIXED: Use correct pagination property structure
  const paginationData =
    paginationTest.pagination.pagination.pagination.pagination;
  TestValidator.predicate(
    "pagination structure valid",
    paginationData.current === 1 &&
      paginationData.limit === 10 &&
      paginationData.records >= 0 &&
      paginationData.pages >= 0,
  );
  // Test with search term combined with status filter
  const searchResponse =
    await api.functional.discussionBoard.admin.appeals.index(adminConnection, {
      body: {
        status: "pending",
        search: RandomGenerator.substring(
          RandomGenerator.paragraph({ sentences: 3 }),
        ),
        page: 1,
        limit: 5,
      } satisfies IDiscussionBoardBanAppeal.IRequest,
    });
  typia.assert(searchResponse);
  // Validate combined filtering works
  const searchPagination =
    searchResponse.pagination.pagination.pagination.pagination;
  TestValidator.predicate(
    "combined status and search filtering valid",
    searchPagination.records >= 0,
  );
}
