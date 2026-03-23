import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReport";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditCloneReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

/**
 * Test that an authenticated admin can filter reports by specific community and content type.
 *
 * 1. Admin authenticates via /auth/admin/join
 * 2. Admin calls PATCH /redditClone/admin/reports with filters for community_id and content_type='comment'
 * 3. Verify all returned reports match both filters
 * 4. Verify reports have correct content type indicators (reportedComment non-null, reportedPost null)
 */
export async function test_api_admin_reports_filter_by_community_and_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
      bio: null,
      avatar: null,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  // 2. Prepare filter request with a specific community_id
  // In a real test scenario, this would be an actual community ID from test data
  const targetCommunityId = typia.random<string & tags.Format<"uuid">>();
  const filterRequest = {
    community_id: targetCommunityId,
    content_type: "comment",
  } satisfies IRedditCloneReport.IRequest;
  // 3. Call the reports endpoint with filters
  const response = await api.functional.redditClone.admin.reports.index(
    adminConnection,
    { body: filterRequest },
  );
  typia.assert(response);
  // 4. Validate all returned reports match the community filter
  await ArrayUtil.asyncForEach(response.data, async (report, i) => {
    TestValidator.equals(
      `report ${i} belongs to filtered community`,
      report.community.id,
      targetCommunityId,
    );
    // 5. Validate all reports are comment type
    TestValidator.equals(
      `report ${i} has content type 'comment'`,
      report.contentType,
      "comment",
    );
    // 6. Validate reportedComment is non-null for comment reports
    TestValidator.predicate(
      `report ${i} has reportedComment populated`,
      report.reportedComment !== null,
    );
    // 7. Validate reportedPost is null for comment reports
    TestValidator.equals(
      `report ${i} has null reportedPost`,
      report.reportedPost,
      null,
    );
  });
  // 8. Test with different filter combination - post type
  const postFilterRequest = {
    community_id: targetCommunityId,
    content_type: "post",
  } satisfies IRedditCloneReport.IRequest;
  const postResponse = await api.functional.redditClone.admin.reports.index(
    adminConnection,
    { body: postFilterRequest },
  );
  typia.assert(postResponse);
  // 9. Validate post-type reports have correct structure
  await ArrayUtil.asyncForEach(postResponse.data, async (report, i) => {
    TestValidator.equals(
      `post report ${i} belongs to filtered community`,
      report.community.id,
      targetCommunityId,
    );
    TestValidator.equals(
      `post report ${i} has content type 'post'`,
      report.contentType,
      "post",
    );
    TestValidator.equals(
      `post report ${i} has null reportedComment`,
      report.reportedComment,
      null,
    );
    TestValidator.predicate(
      `post report ${i} has reportedPost populated`,
      report.reportedPost !== null,
    );
  });
}
