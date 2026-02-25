import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IDiscussionBoardAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardAdmin";
import type { IDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardCommentRateLimit";
import type { IDiscussionBoardUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IDiscussionBoardUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIDiscussionBoardCommentRateLimit } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIDiscussionBoardCommentRateLimit";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_comment_rate_limit_search_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IDiscussionBoardAdmin.IJoin,
  });
  // 2. Get all records with default pagination
  const firstPage =
    await api.functional.discussionBoard.admin.comment_rate_limits.index(
      adminConnection,
      {
        body: {} satisfies IDiscussionBoardCommentRateLimit.IRequest,
      },
    );
  typia.assert(firstPage);
  // Validate pagination metadata exists
  TestValidator.predicate(
    "pagination object exists",
    firstPage.pagination !== undefined,
  );
  TestValidator.equals(
    "default page should be 1",
    firstPage.pagination.current,
    1,
  );
  TestValidator.predicate(
    "limit should be positive",
    firstPage.pagination.limit > 0,
  );
  TestValidator.predicate(
    "total records non-negative",
    firstPage.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages non-negative",
    firstPage.pagination.pages >= 0,
  );
  // Validate each record structure
  for (const record of firstPage.data) {
    typia.assert(record);
    TestValidator.predicate(
      "record has id",
      record.id !== undefined && record.id.length > 0,
    );
    TestValidator.predicate(
      "record has submitted_at",
      record.submitted_at !== undefined,
    );
    TestValidator.predicate(
      "record has user object",
      record.user !== undefined,
    );
    typia.assert(record.user);
    TestValidator.predicate(
      "user has display_name",
      record.user.display_name !== undefined,
    );
  }
  // 3. Test pagination - request second page with limit=10
  // Only proceed if there are enough records for pagination
  if (firstPage.pagination.records > 10) {
    const secondPage =
      await api.functional.discussionBoard.admin.comment_rate_limits.index(
        adminConnection,
        {
          body: {
            page: 2,
            limit: 10,
          } satisfies IDiscussionBoardCommentRateLimit.IRequest,
        },
      );
    typia.assert(secondPage);
    TestValidator.equals(
      "second page number",
      secondPage.pagination.current,
      2,
    );
    TestValidator.equals(
      "limit matches request",
      secondPage.pagination.limit,
      10,
    );
    TestValidator.notEquals(
      "second page data should differ from first page",
      secondPage.data,
      firstPage.data,
    );
  }
  // 4. Test sorting by submitted_at descending (most recent first)
  // Verify timestamps are in descending order
  for (let i = 0; i < firstPage.data.length - 1; i++) {
    const current = new Date(firstPage.data[i].submitted_at);
    const next = new Date(firstPage.data[i + 1].submitted_at);
    TestValidator.predicate(
      `record ${i} submitted_at >= record ${i + 1} submitted_at`,
      current.getTime() >= next.getTime(),
    );
  }
  // 5. Test filtering by date range
  // Create a date range from the first record's timestamp
  if (firstPage.data.length > 0) {
    const sampleDate = new Date(firstPage.data[0].submitted_at);
    const startDate = new Date(sampleDate.getTime() - 24 * 60 * 60 * 1000); // 1 day before
    const endDate = new Date(sampleDate.getTime() + 24 * 60 * 60 * 1000); // 1 day after
    const filtered =
      await api.functional.discussionBoard.admin.comment_rate_limits.index(
        adminConnection,
        {
          body: {
            submitted_at_start: startDate.toISOString(),
            submitted_at_end: endDate.toISOString(),
          } satisfies IDiscussionBoardCommentRateLimit.IRequest,
        },
      );
    typia.assert(filtered);
    // All filtered records should be within the date range
    for (const record of filtered.data) {
      const recordDate = new Date(record.submitted_at);
      TestValidator.predicate(
        "record within start date",
        recordDate.getTime() >= startDate.getTime(),
      );
      TestValidator.predicate(
        "record within end date",
        recordDate.getTime() <= endDate.getTime(),
      );
    }
  }
}
