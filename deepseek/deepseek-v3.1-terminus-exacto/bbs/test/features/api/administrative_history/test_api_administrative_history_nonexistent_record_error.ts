import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAdminRequest } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminRequest";
import type { IDiscussionBoardAdministrativeHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministrativeHistory";
import type { IDiscussionBoardAdministratorAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdministratorAssignment";
import type { IDiscussionBoardAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuditLog";
import type { IDiscussionBoardMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardMember";
import type { IDiscussionBoardUserBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUserBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_administrative_history_nonexistent_record_error(
  connection: api.IConnection,
): Promise<void> {
  // Create super administrator connection
  const adminConnection: api.IConnection = { host: connection.host };
  // Authenticate as super administrator using utility function
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Generate a clearly non-existent UUID
  const nonExistentHistoryId = typia.random<string & tags.Format<"uuid">>();
  // Attempt to retrieve non-existent administrative history record
  await TestValidator.httpError(
    "retrieving non-existent administrative history should return 404",
    404,
    async () => {
      await api.functional.discussionBoard.admin.administrative_histories.at(
        adminConnection,
        {
          historyId: nonExistentHistoryId,
        },
      );
    },
  );
  // Test with invalid UUID format
  await TestValidator.httpError(
    "retrieving with invalid UUID format should return 400",
    400,
    async () => {
      await api.functional.discussionBoard.admin.administrative_histories.at(
        adminConnection,
        {
          historyId: "invalid-uuid-format" as string & tags.Format<"uuid">,
        },
      );
    },
  );
}
