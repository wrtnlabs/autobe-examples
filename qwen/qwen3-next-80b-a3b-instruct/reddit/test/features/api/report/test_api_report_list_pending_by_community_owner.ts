import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommentReport";
import type { IRedditCommunityCommentReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommentReport";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_report_list_pending_by_community_owner(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create a new community owner account
  const communityOwnerConnection: api.IConnection = { host: connection.host };
  const joinResponse = await authorize_community_owner_join(
    communityOwnerConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityCommunityOwner.IJoin,
    },
  );
  typia.assert(joinResponse);
  // 2. Log in to establish authorization
  const loginConnection: api.IConnection = { host: connection.host };
  const loginResponse = await authorize_community_owner_login(loginConnection, {
    body: {
      email: joinResponse.token.access ?? "",
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  typia.assert(loginResponse);
  // 3. Call the reports.index endpoint to list pending reports (no filters)
  // Per the scenario: "Retrieve all pending reports across their owned communities without filters"
  // The endpoint specification states that when no filters are applied, returns all pending reports
  const response =
    await api.functional.redditCommunity.communityOwner.reports.index(
      loginConnection,
      {
        body: {
          status: "pending",
          target_type: "comment",
          sortBy: "newest",
          page: 1,
          limit: 20,
        } satisfies IRedditCommunityCommentReport.IRequest,
      },
    );
  typia.assert(response);
  // 4. Validate response structure
  TestValidator.equals(
    "response has data array",
    Array.isArray(response.data),
    true,
  );
  TestValidator.equals(
    "response has pagination object",
    typeof response.pagination === "object",
    true,
  );
  // 5. Validate that all reports are pending (as per scenario requirement)
  TestValidator.equals(
    "all reports have status pending",
    response.data.every((report) => report.status === "pending"),
    true,
  );
  // 6. Validate that each report has required properties
  TestValidator.predicate(
    "all reports have valid comment_id",
    response.data.every(
      (report) =>
        typeof report.comment_id === "string" && report.comment_id.length > 0,
    ),
  );
  TestValidator.predicate(
    "all reports have valid reporter_id",
    response.data.every(
      (report) =>
        typeof report.reporter_id === "string" && report.reporter_id.length > 0,
    ),
  );
  TestValidator.predicate(
    "all reports have valid created_at",
    response.data.every(
      (report) =>
        typeof report.created_at === "string" &&
        !isNaN(Date.parse(report.created_at)),
    ),
  );
  TestValidator.predicate(
    "all reports have valid updated_at",
    response.data.every(
      (report) =>
        typeof report.updated_at === "string" &&
        !isNaN(Date.parse(report.updated_at)),
    ),
  );
  // 7. Validate pagination metadata
  TestValidator.equals(
    "pagination current page is 1",
    response.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit is 20", response.pagination.limit, 20);
  TestValidator.predicate(
    "pagination records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    response.pagination.pages >= 0,
  );
  // 8. Verify that response meta matches number of records
  TestValidator.equals(
    "pagination records equals data array length",
    response.pagination.records,
    response.data.length,
  );
}
