import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test comment reports endpoint with empty results when no reports exist.
 *
 * Validates that a community moderator can successfully access the comment reports endpoint even when there are no reports across all their moderated communities. This edge case ensures the system handles empty result sets gracefully and returns proper pagination metadata.
 *
 * The test covers:
 * 1. Member authentication succeeds
 * 2. Endpoint returns empty data array
 * 3. Pagination metadata shows zero records and zero pages
 * 4. Response structure matches expected type
 *
 * 1. Register a new member account with valid credentials.
 * 2. Create a member-specific connection for authenticated requests.
 * 3. Call the comment reports endpoint with default pagination parameters.
 * 4. Validate response structure and empty data array.
 * 5. Verify pagination metadata shows zero total records and pages.
 */
export async function test_api_comment_reports_empty_results_no_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: null,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Call comment reports endpoint with empty filters
  const reports =
    await api.functional.redditLike.member.reports_of_comments.index(
      memberConnection,
      {
        body: {
          page: 1,
          limit: 10,
        } satisfies IRedditLikeReport.IRequest,
      },
    );
  typia.assert(reports);
  // 3. Validate empty data array
  TestValidator.equals("data array is empty", reports.data.length, 0);
  // 4. Validate pagination metadata
  TestValidator.equals("current page is 1", reports.pagination.current, 1);
  TestValidator.equals("limit is 10", reports.pagination.limit, 10);
  TestValidator.equals("total records is 0", reports.pagination.records, 0);
  TestValidator.equals("total pages is 0", reports.pagination.pages, 0);
}
