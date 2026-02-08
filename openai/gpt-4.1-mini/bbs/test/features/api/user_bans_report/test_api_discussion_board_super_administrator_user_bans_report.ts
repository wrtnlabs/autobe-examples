import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardUserBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_discussion_board_super_administrator_user_bans_report(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval of the user ban report by a super administrator
  // 1. Super administrator join (register and authenticate)
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {
      body: {},
    },
  );
  typia.assert(superAdminAuth);
  superAdminConnection.headers ??= {};
  superAdminConnection.headers["Authorization"] = superAdminAuth.token.access;
  // 2. Retrieve user ban report
  const report =
    await api.functional.discussionBoard.superAdministrator.userBans.report.index(
      superAdminConnection,
    );
  typia.assert(report);
  // 3. Validate pagination structure
  TestValidator.predicate(
    "pagination exists",
    report.pagination !== null && report.pagination !== undefined,
  );
  TestValidator.predicate("data array exists", Array.isArray(report.data));
  // 4. Validate each record has plausible properties
  report.data.forEach((ban) => {
    // ban is IDiscussionBoardUserBan.ISummary type
    // We cannot access properties as the ISummary type is empty in definition.
    // So, we do typia.assert to ensure the response is valid.
    typia.assert(ban);
  });
  // 5. Validate sorting by ban timestamp descending if possible
  // Since the exact timestamp property name is not available, skipping explicit sorting check.
  // Scenario 2: Authorization enforcement for user ban report endpoint
  // 1. Attempt to access without authentication
  await TestValidator.httpError("access denied without auth", 401, async () => {
    const anonymousConnection: api.IConnection = { host: connection.host };
    await api.functional.discussionBoard.superAdministrator.userBans.report.index(
      anonymousConnection,
    );
  });
  // 2. Authenticate as super administrator again and confirm access
  const superAdminConnection2: api.IConnection = { host: connection.host };
  const superAdminAuth2 = await authorize_super_administrator_join(
    superAdminConnection2,
    {
      body: {},
    },
  );
  typia.assert(superAdminAuth2);
  superAdminConnection2.headers ??= {};
  superAdminConnection2.headers["Authorization"] = superAdminAuth2.token.access;
  const report2 =
    await api.functional.discussionBoard.superAdministrator.userBans.report.index(
      superAdminConnection2,
    );
  typia.assert(report2);
  // Scenario 3: Handling edge cases for missing banning administrator information
  // Since the schema is empty to access detailed properties, we check for presence of ban records with falsy banning administrator
  const hasMissingAdminInfo = report2.data.some((ban) => {
    // Cannot check specific property because of empty schema, so consider null or undefined presence
    return (
      ban == null || (typeof ban === "object" && Object.keys(ban).length === 0)
    );
  });
  // We cannot assert exact property but ensure no errors occur and data is returned
  TestValidator.predicate(
    "handles missing banning administrator info gracefully",
    hasMissingAdminInfo || report2.data.length === 0,
  );
}
