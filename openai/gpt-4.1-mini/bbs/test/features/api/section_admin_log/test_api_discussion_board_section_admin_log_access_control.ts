import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import type { IDiscussionBoardSuperAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSuperAdministrator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_super_administrator_join } from "../../../authorize/authorize_super_administrator_join";
import { authorize_super_administrator_login } from "../../../authorize/authorize_super_administrator_login";
import { authorize_super_administrator_refresh } from "../../../authorize/authorize_super_administrator_refresh";

export async function test_api_discussion_board_section_admin_log_access_control(
  connection: api.IConnection,
): Promise<void> {
  // Verify access to retrieve section administration logs is restricted to superAdministrator only
  // 1. Prepare superAdministrator actor login context by joining
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_administrator_join(
    superAdminConnection,
    {},
  );
  typia.assert(superAdminAuth);
  // 2. Attempt access without authentication (base connection), expect 403
  await TestValidator.httpError(
    "access forbidden without authentication",
    403,
    async () => {
      await api.functional.discussionBoard.superAdministrator.sectionAdminLogs.at(
        connection,
        { id: typia.random<string & tags.Format<"uuid">>() },
      );
    },
  );
  // 3. Attempt successful access with superAdministrator authentication
  const arbitraryUuid = typia.random<string & tags.Format<"uuid">>();
  const logEntry =
    await api.functional.discussionBoard.superAdministrator.sectionAdminLogs.at(
      superAdminConnection,
      { id: arbitraryUuid },
    );
  typia.assert(logEntry);
  // 4. Validate important fields in log entry
  TestValidator.predicate(
    "logEntry id is a valid uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
      logEntry.id,
    ),
  );
  TestValidator.predicate(
    "logEntry actionType is non-empty",
    typeof logEntry.actionType === "string" && logEntry.actionType.length > 0,
  );
  TestValidator.predicate(
    "logEntry createdAt is ISO date",
    typeof logEntry.createdAt === "string" &&
      !isNaN(Date.parse(logEntry.createdAt)),
  );
  TestValidator.predicate(
    "logEntry administrator exists",
    logEntry.administrator !== null && logEntry.administrator !== undefined,
  );
  typia.assert(logEntry.administrator);
  typia.assert(logEntry.section);
  TestValidator.predicate(
    "logEntry section exists",
    logEntry.section !== null && logEntry.section !== undefined,
  );
}
