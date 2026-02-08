import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

/**
 * Test unauthorized deletion of a comment report.
 *
 * Attempts to delete a comment report without moderator authorization.
 * Expects the system to reject with a 403 Forbidden error.
 * Ensures no comment reports are deleted.
 */
export async function test_api_moderator_comment_report_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Moderator Actor Join (to ensure moderator context is known but do NOT use its connection for deletion)
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(authorized);
  // Create unauthorized connection (no authorization headers)
  const unauthorizedConnection: api.IConnection = { host: connection.host };
  // Use a random UUID for a comment report id to attempt deletion
  const commentReportId = typia.random<string & tags.Format<"uuid">>();
  // Attempt unauthorized deletion and expect HTTP 403 Forbidden error
  await TestValidator.httpError(
    "unauthorized comment report deletion should be rejected with 403",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.comment_reports.erase(
        unauthorizedConnection,
        {
          commentReportId,
        },
      );
    },
  );
}
