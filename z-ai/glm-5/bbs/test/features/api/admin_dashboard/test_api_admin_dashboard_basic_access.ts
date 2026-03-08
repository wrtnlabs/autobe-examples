import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDashboardSummary } from "@ORGANIZATION/PROJECT-api/lib/structures/IDashboardSummary";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test successful admin dashboard access with populated platform statistics.
 * An administrator authenticates via join and retrieves the dashboard.
 * Validate that all statistics fields are present and contain valid values.
 */
export async function test_api_admin_dashboard_basic_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication via join
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Retrieve dashboard data
  const dashboard =
    await api.functional.discussionBoard.admin.dashboard.at(adminConnection);
  typia.assert(dashboard);
  // 3. Validate all statistics fields are present with valid values
  // typia.assert validates all type constraints (non-negative, int32, formats)
  // Here we validate business logic: nested structures and relationships
  // Validate articles_bySection items have required properties
  dashboard.articles_bySection.forEach((section) => {
    TestValidator.predicate(
      `section ${section.name} has valid sectionId`,
      section.sectionId.length > 0,
    );
    TestValidator.predicate(
      `section ${section.name} has valid name`,
      section.name.length > 0,
    );
  });
  // Validate sections_mostActive when present
  if (dashboard.sections_mostActive !== null) {
    TestValidator.predicate(
      "most active section has valid id",
      dashboard.sections_mostActive.id.length > 0,
    );
    TestValidator.predicate(
      "most active section has valid name",
      dashboard.sections_mostActive.name.length > 0,
    );
  }
}
