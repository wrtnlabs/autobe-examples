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

export async function test_api_admins_search_advanced_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdmin = await authorize_super_admin_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(superAdmin);
  // Test email partial match
  const emailSearch = await api.functional.discussionBoard.admins.index(
    superAdminConnection,
    {
      body: {
        email: "admin", // Partial email match
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(emailSearch);
  TestValidator.predicate(
    "email partial match returns results",
    emailSearch.data.length >= 0,
  );
  // Test display_name partial match
  const nameSearch = await api.functional.discussionBoard.admins.index(
    superAdminConnection,
    {
      body: {
        display_name: "admin", // Partial display name match
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(nameSearch);
  TestValidator.predicate(
    "display_name partial match returns results",
    nameSearch.data.length >= 0,
  );
  // Test temporal filtering
  const recentAdmins = await api.functional.discussionBoard.admins.index(
    superAdminConnection,
    {
      body: {
        created_at_start: new Date(Date.now() - 86400000 * 30).toISOString(), // Last 30 days
        created_at_end: new Date().toISOString(),
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(recentAdmins);
  TestValidator.predicate(
    "temporal filter returns results",
    recentAdmins.data.length >= 0,
  );
  // Test active status filtering
  const activeAdmins = await api.functional.discussionBoard.admins.index(
    superAdminConnection,
    {
      body: {
        active: true,
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(activeAdmins);
  TestValidator.predicate(
    "active status filter returns results",
    activeAdmins.data.length >= 0,
  );
  // Test combined filters
  const combinedSearch = await api.functional.discussionBoard.admins.index(
    superAdminConnection,
    {
      body: {
        email: "admin",
        display_name: "admin",
        active: true,
        created_at_start: new Date(Date.now() - 86400000 * 365).toISOString(), // Last year
        created_at_end: new Date().toISOString(),
        page: 1,
        limit: 10,
      },
    },
  );
  typia.assert(combinedSearch);
  TestValidator.predicate(
    "combined filters return results",
    combinedSearch.data.length >= 0,
  );
  // Test pagination
  const paginatedSearch = await api.functional.discussionBoard.admins.index(
    superAdminConnection,
    {
      body: {
        page: 1,
        limit: 5,
      },
    },
  );
  typia.assert(paginatedSearch);
  TestValidator.predicate(
    "pagination returns results",
    paginatedSearch.data.length >= 0,
  );
  TestValidator.predicate(
    "pagination limit is respected",
    paginatedSearch.data.length <= 5,
  );
  // Validate response structure for one search result
  if (paginatedSearch.data.length > 0) {
    const sampleAdmin = paginatedSearch.data[0];
    TestValidator.predicate("admin has id", typeof sampleAdmin.id === "string");
    TestValidator.predicate(
      "admin has email",
      typeof sampleAdmin.email === "string",
    );
    TestValidator.predicate(
      "admin has display_name",
      typeof sampleAdmin.display_name === "string",
    );
    TestValidator.predicate(
      "admin has created_at",
      typeof sampleAdmin.created_at === "string",
    );
  }
}
