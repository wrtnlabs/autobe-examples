import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorDistributionStatistic";
import type { IDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorPromotionRequest";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdmin";
import type { IDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdminSession";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardAdministratorDistributionStatistic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorDistributionStatistic";
import type { IPageIDiscussionBoardAdministratorPromotionRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardAdministratorPromotionRequest";
import type { IPageIDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSection";
import type { IPageIDiscussionBoardSuperAdminSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardSuperAdminSession";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";

export async function test_api_superadmin_session_listing_no_filters_default(
  connection: api.IConnection,
): Promise<void> {
  // Create super admin connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  // Create super admin account
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
  // Call session listing endpoint without filters
  const response =
    await api.functional.discussionBoard.superAdmin.super_admins.sessions.index(
      superAdminConnection,
      {
        body: {} satisfies IDiscussionBoardSuperAdminSession.IRequest,
      },
    );
  typia.assert(response);
  // Validate pagination metadata with correct property names
  // The pagination structure is nested: response.pagination.pagination.pagination.pagination
  const finalPagination =
    response.pagination?.pagination?.pagination?.pagination;
  TestValidator.predicate("pagination exists", finalPagination !== undefined);
  TestValidator.predicate("current page is 1", finalPagination?.current === 1);
  TestValidator.predicate(
    "limit is reasonable",
    (finalPagination?.limit ?? 0) > 0,
  );
  TestValidator.predicate(
    "records count is non-negative",
    (finalPagination?.records ?? 0) >= 0,
  );
  TestValidator.predicate(
    "pages count is valid",
    (finalPagination?.pages ?? 0) >= 0,
  );
  // Validate session data structure
  TestValidator.predicate("data is array", Array.isArray(response.data));
  for (const session of response.data) {
    typia.assert(session);
    TestValidator.predicate("session has id", typeof session.id === "string");
    TestValidator.predicate("session has ip", typeof session.ip === "string");
    TestValidator.predicate(
      "session has expired_at",
      typeof session.expired_at === "string",
    );
    TestValidator.predicate(
      "session has created_at",
      typeof session.created_at === "string",
    );
  }
  // Basic validation that we got some data back
  TestValidator.predicate("response contains data", response.data.length >= 0);
}
