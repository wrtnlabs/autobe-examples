import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAuthorizationToken";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardReport";

/**
 * Validate that unauthorized access to the moderation report listing endpoint
 * is correctly denied.
 *
 * Any attempt to retrieve a list of moderation reports without proper
 * administrator authentication must result in an authorization error. This test
 * covers two scenarios:
 *
 * 1. Unauthenticated user (completely fresh connection, no auth context)
 * 2. Authenticated non-admin user (if such an endpoint existed; here, only
 *    unauthenticated is tested)
 *
 * Steps:
 *
 * 1. Attempt to call the moderation report listing endpoint with an
 *    unauthenticated connection and assert that an authorization error is
 *    thrown.
 * 2. Register and authenticate as admin, then assert that the same call succeeds
 *    for admin context (for completeness, but focus on failure for
 *    unauthenticated).
 */
export async function test_api_moderation_report_list_access_denied_without_auth(
  connection: api.IConnection,
) {
  // 1. Attempt as unauthenticated user (fresh connection without headers)
  const unauthConn: api.IConnection = { ...connection, headers: {} };
  await TestValidator.error(
    "moderation report list denied without auth",
    async () => {
      await api.functional.discussionBoard.admin.moderation.reports.index(
        unauthConn,
        {
          body: {}, // minimal valid filter (all fields optional)
        },
      );
    },
  );

  // 2. Register and authenticate as admin
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10) + "Aa!",
    href: "https://autobe-test.local/join",
    referrer: "https://autobe-test.local/",
  } satisfies IDiscussionBoardAdmin.IJoin;

  const adminAuth: IDiscussionBoardAdmin.IAuthorized =
    await api.functional.auth.admin.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(adminAuth);

  // 3. Confirm accessible after admin login (should succeed)
  const output: IPageIDiscussionBoardReport.ISummary =
    await api.functional.discussionBoard.admin.moderation.reports.index(
      connection,
      {
        body: {},
      },
    );
  typia.assert(output);
}
