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

export async function test_api_report_list_filtered_by_status_and_type(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Community owner filters reports by status 'pending' and target_type 'comment' to view only pending comment reports.
  // System returns paginated reports matching criteria, including reporter username and comment preview.
  // Authorization ensures reports are only from communities owned by the authenticated user.
  // Step 1: Create and authenticate a new community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
    display_name: RandomGenerator.name(),
  } satisfies IRedditCommunityCommunityOwner.IJoin;
  const authorizedOwner = await authorize_community_owner_join(
    ownerConnection,
    { body: ownerCredentials },
  );
  typia.assert(authorizedOwner);
  // Update owner connection with authorization token
  const authenticatedOwnerConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: `Bearer ${authorizedOwner.token.access}` },
  };
  // Step 2: Query reports with status 'pending' and target_type 'comment' (required by IRequest type)
  const reportFilter: IRedditCommunityCommentReport.IRequest = {
    status: "pending",
    target_type: "comment",
    sortBy: "newest",
    page: 1,
    limit: 10,
  };
  const response =
    await api.functional.redditCommunity.communityOwner.reports.index(
      authenticatedOwnerConnection,
      { body: reportFilter },
    );
  typia.assert(response);
  // Step 3: Validate response structure and type safety
  TestValidator.equals(
    "response has correct pagination structure",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "response has correct limit",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "response has at least 0 reports",
    response.data.length >= 0,
  );
  // Verify all returned reports have the correct structure
  for (const reportItem of response.data) {
    // Validate that the report is a valid IRedditCommunityCommentReport
    typia.assert<IRedditCommunityCommentReport>(reportItem);
    // Verify required fields exist and match the expected types
    TestValidator.equals(
      "report has uuid id",
      typeof reportItem.id === "string",
      true,
    );
    TestValidator.equals(
      "report has comment_id",
      typeof reportItem.comment_id === "string",
      true,
    );
    TestValidator.equals(
      "report has reporter_id",
      typeof reportItem.reporter_id === "string",
      true,
    );
    TestValidator.equals(
      "report has reason string",
      typeof reportItem.reason === "string",
      true,
    );
    TestValidator.equals(
      "report has valid status",
      ["pending", "approved", "dismissed"].includes(reportItem.status),
      true,
    );
    TestValidator.equals(
      "report has date-time created_at",
      typeof reportItem.created_at === "string",
      true,
    );
    TestValidator.equals(
      "report has date-time updated_at",
      typeof reportItem.updated_at === "string",
      true,
    );
    // resolved_at is nullable
    if (
      reportItem.resolved_at !== null &&
      reportItem.resolved_at !== undefined
    ) {
      TestValidator.equals(
        "report has valid resolved_at",
        typeof reportItem.resolved_at === "string",
        true,
      );
    }
  }
  // Test pagination - verify response matches our request parameters
  TestValidator.equals(
    "response pagination matches request page",
    response.pagination.current,
    reportFilter.page,
  );
  TestValidator.equals(
    "response pagination matches request limit",
    response.pagination.limit,
    reportFilter.limit,
  );
  // Validate overall response structure using type assertion
  typia.assert<IPageIRedditCommunityCommentReport>(response);
}
