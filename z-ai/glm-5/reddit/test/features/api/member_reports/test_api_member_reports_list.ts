import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityReport";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

/**
 * Test that a member can retrieve their own submitted content reports with pagination.
 *
 * This test validates the member reports listing endpoint:
 * 1. Member authentication and authorization
 * 2. Retrieval of paginated reports list
 * 3. Response structure validation (pagination metadata, report summaries)
 * 4. Type safety verification of response data
 */
export async function test_api_member_reports_list(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // Step 2: Call the reports listing endpoint with pagination parameters
  const response = await api.functional.community.member.member.reports.index(
    memberConnection,
    {
      body: {
        page: 1,
        limit: 10,
      } satisfies ICommunityReport.IRequest,
    },
  );
  typia.assert(response);
  // Step 3: Validate pagination metadata structure
  const pagination = response.pagination;
  TestValidator.predicate(
    "pagination current is at least 1",
    pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is at least 1",
    pagination.limit >= 1,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    pagination.pages >= 0,
  );
  // Step 4: Validate data array structure
  TestValidator.predicate("data is an array", Array.isArray(response.data));
  // Step 5: Validate each report summary has required fields
  for (const report of response.data) {
    TestValidator.predicate(
      "report has valid UUID id",
      typeof report.id === "string" && report.id.length === 36,
    );
    TestValidator.predicate(
      "report has content_type",
      typeof report.content_type === "string",
    );
    TestValidator.predicate(
      "report has valid content_id",
      typeof report.content_id === "string",
    );
    TestValidator.predicate(
      "report has reason",
      typeof report.reason === "string",
    );
    TestValidator.predicate(
      "report has status",
      typeof report.status === "string",
    );
    TestValidator.predicate(
      "report has created_at",
      typeof report.created_at === "string",
    );
    TestValidator.predicate(
      "report has updated_at",
      typeof report.updated_at === "string",
    );
    TestValidator.predicate(
      "report has reporter object",
      typeof report.reporter === "object" && report.reporter !== null,
    );
    TestValidator.predicate(
      "report has community object",
      typeof report.community === "object" && report.community !== null,
    );
  }
  // Step 6: Validate pagination consistency
  const expectedPages = Math.ceil(pagination.records / pagination.limit) || 0;
  TestValidator.equals(
    "pagination pages calculation",
    pagination.pages,
    expectedPages,
  );
  TestValidator.equals(
    "data length matches pagination",
    response.data.length,
    Math.min(pagination.limit, pagination.records),
  );
  // Step 7: Validate reports are sorted by created_at descending
  if (response.data.length > 1) {
    for (let i = 0; i < response.data.length - 1; i++) {
      const currentCreatedAt = new Date(response.data[i].created_at).getTime();
      const nextCreatedAt = new Date(response.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `reports sorted by created_at descending at index ${i}`,
        currentCreatedAt >= nextCreatedAt,
      );
    }
  }
}
