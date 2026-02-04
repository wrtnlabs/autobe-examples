import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { ICommunityPlatformAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_moderation_reports_pagination_and_performance(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Step 2: Test pagination functionality
  // Test default pagination (limit 20, page 1)
  const paginatedResponse =
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "default page size",
    paginatedResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "default page number",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.predicate(
    "total records is positive",
    () => paginatedResponse.pagination.records > 0,
  );
  TestValidator.equals(
    "total pages at least 1",
    paginatedResponse.pagination.pages,
    Math.ceil(paginatedResponse.pagination.records / 20),
  );
  // Test custom limit of 5
  const limit5Response =
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          limit: 5,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(limit5Response);
  TestValidator.equals("custom limit", limit5Response.pagination.limit, 5);
  TestValidator.equals("data array length", limit5Response.data.length, 5);
  // Test page 2 with limit 10
  const page2Response =
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          page: 2,
          limit: 10,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(page2Response);
  TestValidator.equals("page 2 number", page2Response.pagination.current, 2);
  TestValidator.equals("page 2 limit", page2Response.pagination.limit, 10);
  TestValidator.equals("page 2 data length", page2Response.data.length, 10);
  // Test that full reason text is excluded from summary data as per spec
  for (const report of paginatedResponse.data) {
    TestValidator.equals(
      "report_id is uuid",
      typeof report.report_id,
      "string",
    );
    TestValidator.equals(
      "target_entity_id is uuid",
      typeof report.target_entity_id,
      "string",
    );
    TestValidator.equals(
      "target_type is correctly formatted",
      report.target_type === "post" || report.target_type === "comment",
      true,
    );
    TestValidator.equals(
      "status is properly formatted",
      report.status === "Pending" ||
        report.status === "Approved" ||
        report.status === "Dismissed",
      true,
    );
    TestValidator.equals(
      "reporter_username is string",
      typeof report.reporter_username,
      "string",
    );
    TestValidator.equals(
      "created_at is dateTime",
      typeof report.created_at,
      "string",
    );
    // Verify that reason text field is NOT present in summary
    const keys = Object.keys(report);
    TestValidator.equals(
      "summary has correct number of properties",
      keys.length,
      6,
    );
    // Check if the set of keys matches expected properties
    const expectedKeys = new Set([
      "report_id",
      "target_entity_id",
      "target_type",
      "status",
      "reporter_username",
      "created_at",
    ]);
    // Use Array.from to compare sets since Set.equals doesn't exist
    TestValidator.equals(
      "summary has correct properties",
      expectedKeys.size === keys.length &&
        Array.from(expectedKeys).every((key) => keys.includes(key)) &&
        Array.from(keys).every((key) => expectedKeys.has(key)),
      true,
    );
  }
  // Test caching behavior: identical filter should return cached results
  const firstRequest =
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  const secondRequest =
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  // Validate results are consistent between requests
  TestValidator.equals(
    "cache response content identical",
    firstRequest.pagination.records,
    secondRequest.pagination.records,
  );
  TestValidator.equals(
    "cache response data identical",
    firstRequest.data.length,
    secondRequest.data.length,
  );
  // Test cache key uniqueness with different status values
  const approvedResponse =
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "approved",
          target_type: "post",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(approvedResponse);
  const totalApprovedCount = approvedResponse.pagination.records;
  // Verify 'pending' and 'approved' caches are separate
  TestValidator.notEquals(
    "pending and approved caches are different",
    firstRequest.pagination.records,
    totalApprovedCount,
  );
  // Test cache key uniqueness with different target_type values
  const commentResponse =
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "comment",
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(commentResponse);
  const totalCommentCount = commentResponse.pagination.records;
  // Verify post and comment caches are separate
  TestValidator.notEquals(
    "post and comment caches are different",
    firstRequest.pagination.records,
    totalCommentCount,
  );
  // Test integer limits (1 to 100) for limit parameter
  const limitMinResponse =
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          limit: 1,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(limitMinResponse);
  TestValidator.equals("minimum limit", limitMinResponse.pagination.limit, 1);
  const limitMaxResponse =
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          limit: 100,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  typia.assert(limitMaxResponse);
  TestValidator.equals("maximum limit", limitMaxResponse.pagination.limit, 100);
  // Test invalid limit values (422 errors for values outside range)
  await TestValidator.error("limit 0 should fail", async () => {
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          limit: 0,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  });
  await TestValidator.error("limit 101 should fail", async () => {
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          limit: 101,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  });
  // Test invalid page values (422 for page < 1)
  await TestValidator.error("page 0 should fail", async () => {
    await api.functional.communityPlatform.moderator.moderation.reports.index(
      moderatorConnection,
      {
        body: {
          status: "pending",
          target_type: "post",
          page: 0,
        } satisfies ICommunityPlatformReport.IRequest,
      },
    );
  });
}
