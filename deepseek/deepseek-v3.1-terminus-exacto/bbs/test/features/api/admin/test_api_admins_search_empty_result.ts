import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdmin";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
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

export async function test_api_admins_search_empty_result(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection for authentication
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create future dates with proper type annotation
  const futureDate = new Date(
    Date.now() + 86400000,
  ).toISOString() satisfies string & tags.Format<"date-time"> as string &
    tags.Format<"date-time">;
  const furtherFutureDate = new Date(
    Date.now() + 172800000,
  ).toISOString() satisfies string & tags.Format<"date-time"> as string &
    tags.Format<"date-time">;
  // Search with criteria that won't match any records
  const searchResult = await api.functional.discussionBoard.admins.index(
    superAdminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>() + "nonexistent",
        display_name: "NonExistentUser12345",
        created_at_start: futureDate,
        created_at_end: furtherFutureDate,
        active: true,
        page: 1,
        limit: 10,
      } satisfies IDiscussionBoardAdmin.IRequest,
    },
  );
  // Validate the response
  typia.assert(searchResult);
  // Verify empty results with correct pagination
  TestValidator.equals("empty data array", searchResult.data.length, 0);
  TestValidator.equals(
    "current page is 1",
    searchResult.pagination.pagination.pagination.pagination.current,
    1,
  );
  TestValidator.equals(
    "limit matches request",
    searchResult.pagination.pagination.pagination.pagination.limit,
    10,
  );
  TestValidator.equals(
    "zero total records",
    searchResult.pagination.pagination.pagination.pagination.records,
    0,
  );
  TestValidator.equals(
    "zero total pages",
    searchResult.pagination.pagination.pagination.pagination.pages,
    0,
  );
}
