import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
import type { IDiscussionBoardAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorGrade";
import type { IDiscussionBoardSection } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSection";
import type { IDiscussionBoardSectionAdminLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardSectionAdminLog";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_section_admin_log_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Authenticate as a new administrator, then retrieve an existing section admin log by id
  // 1. Administrator join (register) and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_administrator_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin-password-12345",
    },
  });
  typia.assert(authorizedAdmin);
  // Set authorization header for adminConnection
  adminConnection.headers = {
    Authorization: authorizedAdmin.token.access,
  };
  // 2. Retrieve a section administration log entry by id
  // Use an existing valid UUID; here use randomly generated UUID for test
  const logId = typia.random<string & tags.Format<"uuid">>();
  const log =
    await api.functional.discussionBoard.administrator.sectionAdminLogs.at(
      adminConnection,
      {
        id: logId,
      },
    );
  typia.assert(log);
  // Validate response shape fields existence via typia.assert
  // Confirm id matches requested id
  TestValidator.equals("retrieved log id matches request", log.id, logId);
  // Validate timestamps are ISO date-time strings (via typia.assert already)
  // Validate presence of administrator and section summaries
  TestValidator.predicate(
    "administrator summary present",
    typeof log.administrator === "object" && log.administrator !== null,
  );
  TestValidator.predicate(
    "section summary present",
    typeof log.section === "object" && log.section !== null,
  );
  // Validate actionType is non-empty string
  TestValidator.predicate(
    "actionType is non-empty string",
    typeof log.actionType === "string" && log.actionType.length > 0,
  );
  // note can be undefined, null, or string; if present must be string
  if (log.note !== undefined && log.note !== null) {
    TestValidator.predicate(
      "note, if present, is string",
      typeof log.note === "string",
    );
  }
}
