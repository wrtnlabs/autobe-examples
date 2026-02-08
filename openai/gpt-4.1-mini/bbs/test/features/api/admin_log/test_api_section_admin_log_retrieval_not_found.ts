import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrator";
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

export async function test_api_section_admin_log_retrieval_not_found(
  connection: api.IConnection,
): Promise<void> {
  // Test the retrieval of a non-existent administrative log entry for a discussion board section.
  // Confirm that the system returns a 404 Not Found error when the admin log entry
  // with the given adminLogId or sectionId does not exist in the database.
  // Step 1: Setup - Register an administrator and create an authenticated connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuth.token.access}`,
  };
  // Step 2: Prepare random UUIDs for nonexistent sectionId and adminLogId
  const nonexistentSectionId = typia.random<string & tags.Format<"uuid">>();
  const nonexistentAdminLogId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Attempt to retrieve a non-existent admin log entry
  await TestValidator.httpError(
    "should return 404 error for non-existent admin log entry",
    404,
    async () => {
      await api.functional.discussionBoard.administrator.sections.adminLogs.at(
        adminConnection,
        {
          sectionId: nonexistentSectionId,
          adminLogId: nonexistentAdminLogId,
        },
      );
    },
  );
}
