import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCommentStatusLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentStatusLog";

/**
 * Ensures an administrator can retrieve details of a comment status log as
 * designed for auditability.
 *
 * Steps:
 *
 * 1. Create and authenticate a system administrator account via the join API.
 * 2. Attempt to fetch a comment status log detail using random UUIDs (since no
 *    explicit create API or fixture is available, use typia.random).
 * 3. Validate response for all mandatory fields via typia.assert for strong type
 *    guarantee.
 * 4. Negative path: Attempt fetch with new random (non-existent) status log and
 *    comment IDs, expect error.
 */
export async function test_api_comment_status_log_detail_as_administrator(
  connection: api.IConnection,
) {
  // 1. Administrator registration and authentication
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const password = typia.random<string & tags.Format<"password">>();
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password,
      business_status: null,
    },
  });
  typia.assert(admin);

  // 2. Attempt to fetch a comment status log detail with random UUIDs
  const commentId = typia.random<string & tags.Format<"uuid">>();
  const statusLogId = typia.random<string & tags.Format<"uuid">>();
  const log =
    await api.functional.communityPlatform.administrator.comments.statusLogs.at(
      connection,
      {
        commentId,
        statusLogId,
      },
    );
  typia.assert(log);

  // 3. Negative path: fetch a non-existent status log, should error
  const fakeCommentId = typia.random<string & tags.Format<"uuid">>();
  const fakeStatusLogId = typia.random<string & tags.Format<"uuid">>();
  await TestValidator.error(
    "fetching non-existent comment status log must fail",
    async () => {
      await api.functional.communityPlatform.administrator.comments.statusLogs.at(
        connection,
        {
          commentId: fakeCommentId,
          statusLogId: fakeStatusLogId,
        },
      );
    },
  );
}
