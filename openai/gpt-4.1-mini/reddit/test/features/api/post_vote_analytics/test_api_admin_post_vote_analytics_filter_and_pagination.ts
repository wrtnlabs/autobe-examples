import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformPostVoteOfUserAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVoteOfUserAnalytic";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostVoteOfUserAnalytic } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostVoteOfUserAnalytic";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_post_vote_analytics_filter_and_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Test retrieving paginated post vote analytics as an authorized admin user.
  // 1. Register an admin user and obtain authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {},
  });
  adminConnection.headers = {
    Authorization: adminAuth.token.access,
  };
  // 2. Construct filter criteria for request body
  // - date range: the last 30 days
  // - post type: filtered to "text" posts (if post type is an enum, use correct value or null)
  // - community IDs: random array of UUIDs (fake realistic UUIDs) or empty to not filter
  // - pagination: limit 10, page 1
  // - sort order: by total_votes descending
  // Generate ISO8601 date strings for filtering by date range
  const now = new Date();
  const priorDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  // Fake or random community ids for filtering
  const communityIds = [
    typia.random<string & tags.Format<"uuid">>(),
    typia.random<string & tags.Format<"uuid">>(),
  ];
  // Construct request body respecting exact schema - since schema properties are {},
  // we must create a valid object that respects the deduced structure (empty from schema).
  // We must send filtering properties per description but DTO is empty, so we only
  // pass an empty object as body (because ICommunityPlatformPostVoteOfUserAnalytic.IRequest
  // is empty type, no properties exist to set). Hence we cannot actually pass any filter.
  // 3. Call the API endpoint with the filter and pagination (request body is empty due
  // to empty request DTO structure)
  const response =
    await api.functional.communityPlatform.admin.analytics.posts.votes.index(
      adminConnection,
      {
        body: {},
      },
    );
  // 4. Validate the response is paginated structure with expected properties
  typia.assert(response);
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "current page is at least 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "total records is non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "page count is non-negative",
    response.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "limit per page is positive",
    response.pagination.limit > 0,
  );
  // 6. Validate the items data array
  if (response.data.length > 0) {
    // Validate each item
    for (const item of response.data) {
      typia.assert(item);
      // Since aggregation fields do not exist on the response item type, skip those predicates
      // Validate related post metadata existence if any
      if ("post_id" in item) {
        TestValidator.predicate(
          "post_id is string",
          typeof item["post_id"] === "string",
        );
      }
      if ("title" in item) {
        TestValidator.predicate(
          "title is string",
          typeof item["title"] === "string",
        );
      }
    }
  }
}
