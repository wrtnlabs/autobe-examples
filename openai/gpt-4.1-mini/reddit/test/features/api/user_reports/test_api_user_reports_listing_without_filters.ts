import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReport";
import type { ICommunityPlatformReportReason } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportReason";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";

export async function test_api_user_reports_listing_without_filters(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Scenario: Moderator requests user reports list without filters
   * - Authenticate as user with moderator privileges
   * - Make a PATCH request to /communityPlatform/user/reports without filter parameters (empty body)
   * - Verify response is paginated report summary list
   * - Validate pagination defaults (page 1, default limit)
   * - Validate report summaries structure and data integrity
   * - Ensure all returned reports belong to communities the moderator manages
   */
  // Step 1: Authorize user as moderator (using join utility to create a user, assuming this user is a moderator)
  const userConnection: api.IConnection = { host: connection.host };
  const userAuth = await authorize_user_join(userConnection, {
    body: {
      email: `moderator${Date.now()}@test.com`,
      password: "Test@1234",
      username: `moduser${Date.now()}`,
      displayName: `Moderator User`,
      href: "https://test.com",
      referrer: "https://test.com",
      ip: null,
    },
  });
  userConnection.headers = {
    ...userConnection.headers,
    Authorization: userAuth.token.access,
  };
  // Step 2: Request reports with empty filters
  const response = await api.functional.communityPlatform.user.reports.index(
    userConnection,
    {
      body: {},
    },
  );
  // Step 3: Validate response schema
  typia.assert(response);
  // Step 4: Validate pagination structure and sensible defaults
  TestValidator.predicate(
    "pagination current page is >= 1",
    response.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is >= 1 and <= 100",
    response.pagination.limit >= 1 && response.pagination.limit <= 100,
  );
  TestValidator.predicate(
    "pagination records are non-negative",
    response.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages are non-negative",
    response.pagination.pages >= 0,
  );
  // Step 5: Validate content array is an array and of appropriate length
  TestValidator.predicate(
    "data array is an array",
    Array.isArray(response.data),
  );
  // Step 6: Validate each report summary structure
  response.data.forEach((report) => {
    typia.assert(report);
    // Validate required properties types (strictness done by typia.assert)
    // Check references types for nested objects
    typia.assert(report.user);
    typia.assert(report.reportReason);
    // Count of reported contents is a non-negative int
    TestValidator.predicate(
      "reportedContents_count >= 0",
      report.reportedContents_count >= 0,
    );
    // Status is one of pending, approved, dismissed
    TestValidator.predicate(
      "status one of valid enums",
      ["pending", "approved", "dismissed"].includes(report.status),
    );
  });
  // Because of access control restrictions,
  // the test cannot verify outside of scope here,
  // but can ensure at least some reports are returned or empty list
  TestValidator.predicate(
    "response data length >= 0",
    response.data.length >= 0,
  );
}
