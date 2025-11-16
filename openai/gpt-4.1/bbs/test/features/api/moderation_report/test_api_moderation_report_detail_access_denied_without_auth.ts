import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

/**
 * Validates that access to moderation report details is denied without admin
 * authentication.
 *
 * This test ensures that an unauthenticated request—or a request that does not
 * possess admin privileges—cannot access the sensitive details of a moderation
 * report through the admin endpoint. The API must deny access, returning an
 * appropriate authorization error, and must not leak any report data in the
 * response.
 *
 * Steps:
 *
 * 1. Register a new admin account to prepare the context (dependency, but no
 *    login)
 * 2. Construct a random (valid format) reportId (no guarantee it exists in DB)
 * 3. Make a request to /discussionBoard/admin/moderation/reports/{reportId} using
 *    an unauthenticated connection (no Authorization header)
 * 4. Assert that the request fails with an authorization error
 *    (forbidden/unauthorized). Expect no report data returned.
 */
export async function test_api_moderation_report_detail_access_denied_without_auth(
  connection: api.IConnection,
) {
  // 1. Register new admin (dependency setup)
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(12) + "!1A",
    href: "https://autobe-e2e.local/register",
    referrer: "https://autobe-e2e.local/landing",
  } satisfies IDiscussionBoardAdmin.IJoin;
  await api.functional.auth.admin.join(connection, { body: adminJoinBody });

  // 2. Generate a random reportId (does not matter if it exists)
  const reportId = typia.random<string & tags.Format<"uuid">>();

  // 3. Use an unauthenticated connection (clear headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };

  // 4. Attempt to request moderation report details as unauthenticated user
  await TestValidator.error(
    "prevent access to moderation report detail endpoint without admin login",
    async () => {
      await api.functional.discussionBoard.admin.moderation.reports.at(
        unauthConn,
        { reportId },
      );
    },
  );
}
