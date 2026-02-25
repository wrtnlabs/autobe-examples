import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardArticle } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardArticle";
import type { IDiscussionBoardComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardComment";
import type { IDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardContentFlag";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardContentFlag } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardContentFlag";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

/**
 * Test super administrator search for pending content flags requiring moderation.
 * Validates filtering by 'pending' status and pagination functionality.
 */
export async function test_api_flags_search_pending_moderation(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
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
  // Search for pending flags with pagination
  const searchResult: IPageIDiscussionBoardContentFlag =
    await api.functional.discussionBoard.superAdmin.flags.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(searchResult);
  // Validate pagination metadata - navigate through nested pagination structure
  const actualPagination =
    searchResult.pagination.pagination.pagination.pagination;
  TestValidator.equals("pagination current page", actualPagination.current, 1);
  TestValidator.predicate("pagination limit valid", actualPagination.limit > 0);
  TestValidator.predicate(
    "pagination records non-negative",
    actualPagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    actualPagination.pages >= 0,
  );
  // Validate that all returned flags have 'pending' status
  for (const flag of searchResult.data) {
    TestValidator.equals(
      "flag status should be pending",
      flag.status,
      "pending",
    );
    // Validate flag structure
    TestValidator.predicate("flag has reporter", flag.reporter !== undefined);
    TestValidator.predicate(
      "flag has flag reason",
      flag.flag_reason.length > 0,
    );
    TestValidator.predicate(
      "flag has creation timestamp",
      flag.created_at !== undefined,
    );
    // Validate that either article or comment is flagged (but not both)
    const hasFlaggedArticle =
      flag.flaggedArticle !== null && flag.flaggedArticle !== undefined;
    const hasFlaggedComment =
      flag.flaggedComment !== null && flag.flaggedComment !== undefined;
    TestValidator.predicate(
      "flag should reference either article or comment, not both",
      (hasFlaggedArticle && !hasFlaggedComment) ||
        (!hasFlaggedArticle && hasFlaggedComment),
    );
  }
  // Test pagination with different page sizes
  const pageSize2Result: IPageIDiscussionBoardContentFlag =
    await api.functional.discussionBoard.superAdmin.flags.index(
      superAdminConnection,
      {
        body: {
          status: "pending",
          page: 1,
          limit: 2,
        } satisfies IDiscussionBoardContentFlag.IRequest,
      },
    );
  typia.assert(pageSize2Result);
  const pageSize2Pagination =
    pageSize2Result.pagination.pagination.pagination.pagination;
  TestValidator.equals("page size 2 limit", pageSize2Pagination.limit, 2);
  TestValidator.predicate(
    "page size 2 data length matches limit",
    pageSize2Result.data.length <= pageSize2Pagination.limit,
  );
}
