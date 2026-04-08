import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IPageIRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityReport";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityComment";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_community_reports_empty_queue(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create and authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Set auth token for subsequent API calls
  adminConnection.headers = adminConnection.headers ?? {};
  adminConnection.headers.Authorization = adminAuth.token.access;
  // 2. Browse communities to find one for testing
  const communities =
    await api.functional.redditCommunity.admin.communities.index(
      adminConnection,
      {
        body: {} satisfies IRedditCommunityCommunity.IRequest,
      },
    );
  typia.assert(communities);
  // Verify we have at least one community to test
  if (communities.data.length === 0) {
    throw new Error("No communities found for testing");
  }
  // Select first community for testing
  const targetCommunity = communities.data[0];
  const communityId = targetCommunity.id;
  // 3. Test empty queue - default pagination
  const emptyQueueResponse =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminConnection,
      {
        communityId,
        body: {} satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(emptyQueueResponse);
  TestValidator.equals(
    "empty queue pagination current",
    emptyQueueResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "empty queue pagination limit",
    emptyQueueResponse.pagination.limit,
    20,
  );
  TestValidator.equals(
    "empty queue pagination records",
    emptyQueueResponse.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty queue pagination pages",
    emptyQueueResponse.pagination.pages,
    0,
  );
  TestValidator.equals(
    "empty queue data array is empty",
    emptyQueueResponse.data,
    [],
  );
  // 4. Test filter parameters on empty queue
  const createdAfterFilterResponse =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminConnection,
      {
        communityId,
        body: {
          created_after: "2025-01-01T00:00:00Z",
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(createdAfterFilterResponse);
  TestValidator.equals(
    "created_after filter returns empty",
    createdAfterFilterResponse.data,
    [],
  );
  // Generate a valid member UUID for reporter_id filter
  const mockMemberId = typia.random<string & tags.Format<"uuid">>();
  const reporterIdFilterResponse =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminConnection,
      {
        communityId,
        body: {
          reporter_id: mockMemberId,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(reporterIdFilterResponse);
  TestValidator.equals(
    "reporter_id filter returns empty",
    reporterIdFilterResponse.data,
    [],
  );
  // 5. Test pagination parameters on empty queue
  const customPaginationResponse =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 50,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(customPaginationResponse);
  TestValidator.equals(
    "custom pagination limit 50",
    customPaginationResponse.pagination.limit,
    50,
  );
  TestValidator.equals(
    "custom pagination records 0",
    customPaginationResponse.pagination.records,
    0,
  );
  const maxLimitResponse =
    await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
      adminConnection,
      {
        communityId,
        body: {
          page: 1,
          limit: 100,
        } satisfies IRedditCommunityReport.IRequest,
      },
    );
  typia.assert(maxLimitResponse);
  TestValidator.equals(
    "max limit 100 accepted",
    maxLimitResponse.pagination.limit,
    100,
  );
  // 6. Test validation errors for invalid parameters
  await TestValidator.httpError(
    "page=0 should return 400",
    400,
    async () =>
      await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
        adminConnection,
        {
          communityId,
          body: {
            page: 0,
          } satisfies IRedditCommunityReport.IRequest,
        },
      ),
  );
  await TestValidator.httpError(
    "limit=101 should return 400 (exceeds max)",
    400,
    async () =>
      await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
        adminConnection,
        {
          communityId,
          body: {
            limit: 101,
          } satisfies IRedditCommunityReport.IRequest,
        },
      ),
  );
  await TestValidator.httpError(
    "limit=0 should return 400 (below min)",
    400,
    async () =>
      await api.functional.redditCommunity.admin.communities.reports.patchByCommunityid(
        adminConnection,
        {
          communityId,
          body: {
            limit: 0,
          } satisfies IRedditCommunityReport.IRequest,
        },
      ),
  );
}
