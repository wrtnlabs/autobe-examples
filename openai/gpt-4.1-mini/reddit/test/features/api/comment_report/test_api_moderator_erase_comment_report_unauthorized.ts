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

export async function test_api_moderator_erase_comment_report_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Test scenario for unauthorized deletion attempt of a comment report without moderator privileges.
  // 1. Attempt deletion without authentication - expect HTTP 403 Forbidden
  // 2. Attempt deletion with non-moderator user connection (simply base connection) - expect HTTP 403 Forbidden
  const dummyCommentReportId = typia.random<string & tags.Format<"uuid">>();
  // Unauthorized deletion attempt (no auth)
  await TestValidator.httpError(
    "should not allow deletion without authentication",
    403,
    async () => {
      const unauthorizedConnection: api.IConnection = { host: connection.host };
      await api.functional.communityPlatform.moderator.commentReports.eraseCommentReport(
        unauthorizedConnection,
        { commentReportId: dummyCommentReportId },
      );
    },
  );
  // Unauthorized deletion attempt (non-moderator user)
  // Since no non-moderator user actor connection is provided, reuse base connection
  await TestValidator.httpError(
    "should not allow deletion with user lacking moderator rights",
    403,
    async () => {
      const nonModeratorConnection: api.IConnection = { host: connection.host };
      await api.functional.communityPlatform.moderator.commentReports.eraseCommentReport(
        nonModeratorConnection,
        { commentReportId: dummyCommentReportId },
      );
    },
  );
}
