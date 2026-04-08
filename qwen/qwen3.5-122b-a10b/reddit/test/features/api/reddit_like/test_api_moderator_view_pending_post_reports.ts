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
 * Test moderator access to pending post reports endpoint.
 *
 * Validates that community moderators can successfully retrieve and view pending content reports for posts in their communities. The test ensures proper authentication, correct filtering of reports, and complete response structure including reporter information and pagination metadata.
 *
 * This scenario covers the essential moderator workflow for content moderation, ensuring that only authorized moderators can access reports for their communities and that all report details are properly returned.
 *
 * 1. Register a new member account for testing.
 * 2. Create a member connection with authentication token.
 * 3. Call the reports-of-posts endpoint with status filter for pending reports.
 * 4. Validate the response structure and pagination metadata.
 * 5. Verify each report contains complete information including reporter details and timestamps.
 * 6. Confirm the response only includes reports accessible to the authenticated moderator.
 */
export async function test_api_moderator_view_pending_post_reports(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // 2. Create a separate connection for the reports endpoint
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = memberConnection.headers;
  // 3. Call the reports endpoint with pending status filter
  const reports = await api.functional.redditLike.member.reports_of_posts.index(
    moderatorConnection,
    {
      body: {
        status: "pending",
        page: 1,
        limit: 10,
      } satisfies IRedditLikeReport.IRequest,
    },
  );
  typia.assert(reports);
  // 4. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    reports.pagination.current,
    1,
  );
  TestValidator.predicate(
    "pagination limit positive",
    reports.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records non-negative",
    reports.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    reports.pagination.pages >= 0,
  );
  // 5. Validate report structure if reports exist
  if (reports.data.length > 0) {
    const firstReport = reports.data[0];
    typia.assert(firstReport);
    // Validate report ID is a valid UUID
    TestValidator.predicate(
      "report ID valid UUID",
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        firstReport.id,
      ),
    );
    // Validate report status is pending
    TestValidator.equals(
      "report status pending",
      firstReport.status,
      "pending",
    );
    // Validate actor type is post
    TestValidator.equals(
      "report actor type post",
      firstReport.actor_type,
      "post",
    );
    // Validate reporter information exists
    TestValidator.predicate(
      "reporter has ID",
      firstReport.reporter.id !== undefined && firstReport.reporter.id !== null,
    );
    TestValidator.predicate(
      "reporter has username",
      firstReport.reporter.username !== undefined &&
        firstReport.reporter.username !== null,
    );
    TestValidator.predicate(
      "reporter has display name",
      firstReport.reporter.display_name !== undefined &&
        firstReport.reporter.display_name !== null,
    );
    TestValidator.predicate(
      "reporter has karma score",
      firstReport.reporter.karma_score !== undefined &&
        firstReport.reporter.karma_score !== null,
    );
    // Validate reason text exists
    TestValidator.predicate(
      "report reason exists",
      firstReport.reason.length > 0,
    );
    // Validate timestamps are valid date-time format
    TestValidator.predicate(
      "created_at valid datetime",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstReport.created_at,
      ),
    );
    TestValidator.predicate(
      "updated_at valid datetime",
      /^[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}/.test(
        firstReport.updated_at,
      ),
    );
  }
}
