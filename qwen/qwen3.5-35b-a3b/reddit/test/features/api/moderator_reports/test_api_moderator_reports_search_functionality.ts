import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_moderator_reports_search_functionality(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test reporter_username partial match search
  const searchConnection1: api.IConnection = { host: connection.host };
  const partialUsernameSearch: IRedditCommunityReport.IRequest = {
    reporter_username: "reporter",
    pageSize: 50,
  } satisfies IRedditCommunityReport.IRequest;
  // Execute the search
  const partialResults =
    await api.functional.redditCommunity.member.reports.index(
      searchConnection1,
      {
        body: partialUsernameSearch,
      },
    );
  typia.assert(partialResults);
  // Validate pagination metadata for partial match search
  TestValidator.equals(
    "partial match pagination records",
    partialResults.pagination.records,
    partialResults.data.length,
  );
  TestValidator.equals(
    "partial match pagination pages",
    partialResults.pagination.pages,
    partialResults.pagination.records > 0
      ? Math.ceil(
          partialResults.pagination.records / partialResults.pagination.limit,
        )
      : 0,
  );
  // 2. Test reason_search with trigram-based matching
  const searchConnection2: api.IConnection = { host: connection.host };
  const reasonSearch: IRedditCommunityReport.IRequest = {
    reason_search: "spam",
    pageSize: 50,
  } satisfies IRedditCommunityReport.IRequest;
  const reasonResults =
    await api.functional.redditCommunity.member.reports.index(
      searchConnection2,
      {
        body: reasonSearch,
      },
    );
  typia.assert(reasonResults);
  // Validate reason search pagination
  TestValidator.equals(
    "reason search pagination records",
    reasonResults.pagination.records,
    reasonResults.data.length,
  );
  // 3. Test searchText - general search across reason and content
  const searchConnection3: api.IConnection = { host: connection.host };
  const generalSearch: IRedditCommunityReport.IRequest = {
    searchText: "violation",
    pageSize: 50,
  } satisfies IRedditCommunityReport.IRequest;
  const generalResults =
    await api.functional.redditCommunity.member.reports.index(
      searchConnection3,
      {
        body: generalSearch,
      },
    );
  typia.assert(generalResults);
  // Validate general search pagination
  TestValidator.equals(
    "general search pagination records",
    generalResults.pagination.records,
    generalResults.data.length,
  );
  // 4. Test empty search results with non-matching terms
  const searchConnection4: api.IConnection = { host: connection.host };
  const emptySearch: IRedditCommunityReport.IRequest = {
    reporter_username: "nonexistent_user_xyz_123",
    reason_search: "nonexistent_reason_abc_789",
    searchText: "nonexistent_content_456",
    pageSize: 50,
  } satisfies IRedditCommunityReport.IRequest;
  const emptyResults =
    await api.functional.redditCommunity.member.reports.index(
      searchConnection4,
      {
        body: emptySearch,
      },
    );
  typia.assert(emptyResults);
  // Validate empty search returns correct pagination metadata
  TestValidator.equals("empty search data array", emptyResults.data, []);
  TestValidator.equals(
    "empty search records",
    emptyResults.pagination.records,
    0,
  );
  TestValidator.equals("empty search pages", emptyResults.pagination.pages, 0);
  // 5. Test combined search filters
  const searchConnection5: api.IConnection = { host: connection.host };
  const combinedSearch: IRedditCommunityReport.IRequest = {
    reporter_username: "reporter",
    status: "pending",
    pageSize: 50,
  } satisfies IRedditCommunityReport.IRequest;
  const combinedResults =
    await api.functional.redditCommunity.member.reports.index(
      searchConnection5,
      {
        body: combinedSearch,
      },
    );
  typia.assert(combinedResults);
  // Validate combined search pagination
  TestValidator.equals(
    "combined search pagination records",
    combinedResults.pagination.records,
    combinedResults.data.length,
  );
  // 6. Validate that empty search returns empty reporter username
  if (emptyResults.data.length > 0) {
    TestValidator.predicate(
      "empty search reporter username is not matching",
      !emptyResults.data.some((report) =>
        report.reporter.username.includes("nonexistent_user_xyz_123"),
      ),
    );
  }
}
