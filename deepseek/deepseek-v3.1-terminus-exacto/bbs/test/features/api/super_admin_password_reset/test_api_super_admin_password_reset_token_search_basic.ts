import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminPasswordReset";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSuperAdminPasswordReset } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminPasswordReset";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_super_admin_password_reset_token_search_basic(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator account via authorize_super_admin_join utility
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
  // Perform basic search for password reset tokens with default parameters
  const searchResults: IPageIDiscussionBoardSuperAdminPasswordReset.ISummary =
    await api.functional.discussionBoard.superAdmin.super_admins.password_resets.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardSuperAdminPasswordReset.IRequest,
      },
    );
  typia.assert(searchResults);
  // Validate pagination structure and empty results
  // Navigate through the nested pagination structure to access the actual pagination properties
  const outermostPagination = searchResults.pagination;
  const midLayer1Pagination = outermostPagination.pagination;
  const midLayer2Pagination = midLayer1Pagination.pagination;
  const actualPagination = midLayer2Pagination.pagination;
  TestValidator.equals(
    "pagination structure exists",
    typeof actualPagination,
    "object",
  );
  TestValidator.equals(
    "data is an array",
    Array.isArray(searchResults.data),
    true,
  );
  TestValidator.predicate(
    "current page is non-negative",
    actualPagination.current >= 0,
  );
  TestValidator.predicate("limit is non-negative", actualPagination.limit >= 0);
  TestValidator.predicate(
    "records count is non-negative",
    actualPagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    actualPagination.pages >= 0,
  );
}
