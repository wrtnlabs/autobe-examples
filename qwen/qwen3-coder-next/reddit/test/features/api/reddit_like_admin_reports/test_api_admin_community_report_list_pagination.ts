import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeReport";
import type { IRedditLikeAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAdmin";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_community_report_list_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Setup: Create admin account for testing
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await api.functional.redditLike.auth.admin.join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.MinLength<1> & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(2),
        display_name: RandomGenerator.name(),
        bio: null,
        avatar_url: null,
      } satisfies IRedditLikeAdmin.IJoin,
    },
  );
  typia.assert(adminAuth);
  // Use the admin connection for subsequent operations
  const testAdminConnection: api.IConnection = { host: connection.host };
  testAdminConnection.headers = { Authorization: adminAuth.token.access };
  // Test 1: Empty reports list - use a valid community name
  const testCommunityName = "test-community-" + RandomGenerator.alphabets(6);
  const emptyReports =
    await api.functional.redditLike.admin.communities.reports.search(
      testAdminConnection,
      {
        communityName: testCommunityName,
      },
    );
  typia.assert(emptyReports);
  TestValidator.equals(
    "empty reports pagination - current page",
    emptyReports.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty reports pagination - limit",
    emptyReports.pagination.limit,
    10,
  );
  TestValidator.equals(
    "empty reports pagination - total records",
    emptyReports.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty reports pagination - pages",
    emptyReports.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty reports data length",
    emptyReports.data.length,
    0,
  );
  // Test 2: Verify pagination structure
  const samplePagination =
    await api.functional.redditLike.admin.communities.reports.search(
      testAdminConnection,
      {
        communityName: testCommunityName,
      },
    );
  typia.assert(samplePagination);
  TestValidator.predicate(
    "pagination has valid current",
    samplePagination.pagination.current >= 0,
  );
  TestValidator.predicate(
    "pagination has valid limit",
    samplePagination.pagination.limit >= 0,
  );
  TestValidator.predicate(
    "pagination has valid records",
    samplePagination.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has valid pages",
    samplePagination.pagination.pages >= 0,
  );
  // Test 3: Verify report structure if any reports exist
  for (const report of samplePagination.data) {
    TestValidator.predicate(
      "report has valid UUID format",
      /^[0-9a-f-]{36}$/i.test(report.id),
    );
    TestValidator.predicate(
      "report has reporter object",
      report.reporter !== null && typeof report.reporter === "object",
    );
    TestValidator.predicate(
      "report has valid content type",
      report.reported_content_type === "post" ||
        report.reported_content_type === "comment",
    );
    TestValidator.predicate(
      "report has valid status",
      ["pending", "approved", "dismissed"].includes(report.status),
    );
    TestValidator.predicate(
      "report has valid timestamp",
      !isNaN(new Date(report.created_at).getTime()),
    );
  }
  // Test 4: Test with invalid community name - empty string should fail
  await TestValidator.error("empty community name should fail", async () => {
    await api.functional.redditLike.admin.communities.reports.search(
      testAdminConnection,
      {
        communityName: "",
      },
    );
  });
}