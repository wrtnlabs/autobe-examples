import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdminUserJoin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminUserJoin";
import type { IDiscussionBoardAdminuser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdminuser";
import type { IDiscussionBoardReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardReport";

export async function test_api_admin_report_detail_not_found_for_unknown_id(
  connection: api.IConnection,
) {
  // 1. Register and authenticate an adminUser so that we have proper adminUser context.
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    display_name: RandomGenerator.name(),
    bio: RandomGenerator.paragraph(),
    ip: null,
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies IDiscussionBoardAdminUserJoin.IRequest;

  const adminAuthorized: IDiscussionBoardAdminuser.IAuthorized =
    await api.functional.auth.adminUser.join(connection, {
      body: joinBody,
    });
  typia.assert(adminAuthorized);

  // 2. Generate a UUID that is extremely unlikely to exist as a report id.
  const unknownReportId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Call the detail endpoint with this unknown report id and expect an error.
  await TestValidator.error(
    "admin report detail should fail for unknown reportId",
    async () => {
      // If this call unexpectedly succeeds, typia.assert on the response would run
      // and the TestValidator.error will mark the test as failed.
      const _output: IDiscussionBoardReport =
        await api.functional.discussionBoard.adminUser.reports.at(connection, {
          reportId: unknownReportId,
        });
      typia.assert(_output);
    },
  );
}
