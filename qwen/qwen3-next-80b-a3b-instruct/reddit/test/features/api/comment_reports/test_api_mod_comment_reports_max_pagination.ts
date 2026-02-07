import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommentReport";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityCommentReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";

export async function test_api_mod_comment_reports_max_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {} satisfies ICommunityModerator.IJoin,
  });
  // 2. Fetch reports with maximum limit of 100
  const reports =
    await api.functional.community.moderator.comments.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending" as const,
          reporter_id: typia.random<string & tags.Format<"uuid">>(),
          reported_comment_id: typia.random<string & tags.Format<"uuid">>(),
          created_at_start: new Date(
            Date.now() - 24 * 60 * 60 * 1000,
          ).toISOString(),
          created_at_end: new Date().toISOString(),
          sort_by: "created_at",
          order: "desc",
          limit: 100, // Maximum allowed
          offset: 0, // First page
        } satisfies ICommunityCommentReport.IRequest,
      },
    );
  typia.assert(reports);
  // 3. Validate pagination and content
  // Verify limit is exactly 100 as requested
  TestValidator.equals(
    "pagination limit is 100",
    reports.pagination.limit,
    100,
  );
  // Verify we received at most 100 reports (this will be the actual count of available reports)
  TestValidator.predicate(
    "reports array length <= 100",
    reports.data.length <= 100,
  );
  // Verify total records count is reported correctly (this is the system's total report count)
  TestValidator.predicate(
    "total records is non-negative",
    reports.pagination.records >= 0,
  );
  // Verify we got the first page of results
  TestValidator.equals("current page is 1", reports.pagination.current, 1);
  // Verify pages calculation: could be 1 or more, but must be >= 1
  TestValidator.predicate(
    "total pages is at least 1",
    reports.pagination.pages >= 1,
  );
}
