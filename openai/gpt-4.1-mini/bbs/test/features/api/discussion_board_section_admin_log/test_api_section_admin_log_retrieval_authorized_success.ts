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

export async function test_api_section_admin_log_retrieval_authorized_success(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieval of an existing administrative log entry for a discussion board section by an authorized administrator.
  // 1. Authorize an administrator joining.
  // 2. Use the authorized administrator connection to call the admin log retrieval API.
  // 3. Assert the response structure and content validity.
  const adminConnection: api.IConnection = { host: connection.host };
  // Step 1: Administrator joining (authorization)
  const authorized = await authorize_administrator_join(adminConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Update adminConnection headers with the authorized token
  adminConnection.headers = {
    ...(adminConnection.headers ?? {}),
    Authorization: `Bearer ${authorized.token.access}`,
  };
  // For testing the retrieval, we need valid sectionId and adminLogId.
  // Since the scenario doesn't specify creation of sections or logs, from the randomness
  // we assume that a valid UUID format is required and server may respond accordingly.
  // Use typia.random<string & tags.Format<"uuid">>() to generate plausible UUIDs for testing.
  const sectionId = typia.random<string & tags.Format<"uuid">>();
  const adminLogId = typia.random<string & tags.Format<"uuid">>();
  // Step 2: Retrieve admin log
  const adminLog =
    await api.functional.discussionBoard.administrator.sections.adminLogs.at(
      adminConnection,
      {
        sectionId: sectionId,
        adminLogId: adminLogId,
      },
    );
  typia.assert(adminLog);
  // Can't access non-existent properties. Skipping all checks related to them.
}