import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportedContent";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportedContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportedContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_reported_contents_index_admin_access_paginated_list(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  // Join admin account
  const admin = await authorize_admin_join(adminConnection, {});
  typia.assert(admin);
  // Use token in headers for adminConnection
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = `Bearer ${admin.token.access}`;
  // 1. Request paginated list of reported contents with no filters
  const filter: ICommunityPlatformReportedContent.IRequest = {};
  const reportedContentsPage =
    await api.functional.communityPlatform.admin.reportedContents.index(
      adminConnection,
      { body: filter },
    );
  typia.assert(reportedContentsPage);
  // 2. Validate pagination metadata
  const pagination = reportedContentsPage.pagination;
  TestValidator.predicate(
    "pagination current page >= 0",
    pagination.current >= 0,
  );
  TestValidator.predicate("pagination limit >= 0", pagination.limit >= 0);
  TestValidator.predicate("pagination records >= 0", pagination.records >= 0);
  TestValidator.predicate("pagination pages >= 0", pagination.pages >= 0);
  // 3. Validate contents
  for (const item of reportedContentsPage.data) {
    typia.assert(item);
    // Report must be present
    TestValidator.predicate("report exists", item.report !== null);
    if (item.report) {
      typia.assert(item.report);
      // Validate reporter info
      typia.assert(item.report.user);
      typia.assert(item.report.reportReason);
      TestValidator.predicate(
        "user ID valid UUID",
        /^[0-9a-f-]{36}$/i.test(item.report.user.id),
      );
      TestValidator.predicate(
        "report reason ID valid UUID",
        /^[0-9a-f-]{36}$/i.test(item.report.reportReason.id),
      );
    }
    // Either reportedPost or reportedComment must be present
    TestValidator.predicate(
      "reportedPost or reportedComment present",
      item.reportedPost !== null || item.reportedComment !== null,
    );
    if (item.reportedPost !== null) {
      typia.assert(item.reportedPost);
      TestValidator.predicate(
        "reportedPost ID valid UUID",
        /^[0-9a-f-]{36}$/i.test(item.reportedPost.id),
      );
    }
    if (item.reportedComment !== null) {
      typia.assert(item.reportedComment);
      TestValidator.predicate(
        "reportedComment ID valid UUID",
        /^[0-9a-f-]{36}$/i.test(item.reportedComment.id),
      );
    }
  }
  // 4. Edge case: Empty result when no reports
  // For this test, we create a new admin with a different email for isolation
  const adminConnection2: api.IConnection = { host: connection.host };
  const admin2 = await authorize_admin_join(adminConnection2, {
    body: {
      email: `empty${Date.now()}@example.com`,
      password: "password123",
      displayName: "EmptyAdmin",
    },
  });
  typia.assert(admin2);
  adminConnection2.headers ??= {};
  adminConnection2.headers.Authorization = `Bearer ${admin2.token.access}`;
  // Perform query with filter that likely yields no results (future createdAfter date)
  const nonePage =
    await api.functional.communityPlatform.admin.reportedContents.index(
      adminConnection2,
      {
        body: {
          createdAfter: new Date(
            Date.now() + 1000 * 60 * 60 * 24,
          ).toISOString(),
        },
      },
    );
  typia.assert(nonePage);
  TestValidator.equals("empty results data length", nonePage.data.length, 0);
  // 5. Negative case: Unauthorized user access
  const userConnection: api.IConnection = { host: connection.host };
  // Attempt access without admin token
  await TestValidator.error("unauthorized access rejected", async () => {
    await api.functional.communityPlatform.admin.reportedContents.index(
      userConnection,
      {
        body: {},
      },
    );
  });
}
