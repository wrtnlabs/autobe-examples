import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneReportSnapshot";
import type { IRedditCloneAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneAdmin";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneReportSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneReportSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_reports_snapshots_filter_by_status_and_community(
  connection: api.IConnection,
): Promise<void> {
  /**
   * Test admin filtering of report snapshots by status and community.
   * Verifies that the PATCH /redditClone/admin/reports-snapshots endpoint
   * correctly filters snapshots based on status and community_id parameters,
   * and returns properly populated relationship objects.
   */
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
  // 2. Test filtering by status='approved'
  const approvedFilter = {
    status: "approved" as const,
    limit: 20,
  } satisfies IRedditCloneReportSnapshot.IRequest;
  const approvedResult =
    await api.functional.redditClone.admin.reports_snapshots.index(
      adminConnection,
      { body: approvedFilter },
    );
  typia.assert(approvedResult);
  // Validate all returned snapshots have status='approved'
  TestValidator.predicate(
    "all snapshots have approved status",
    approvedResult.data.every((snapshot) => snapshot.status === "approved"),
  );
  // Validate pagination structure
  TestValidator.equals(
    "pagination limit matches request",
    approvedResult.pagination.limit,
    20,
  );
  // 3. Test filtering by status='pending'
  const pendingFilter = {
    status: "pending" as const,
    limit: 20,
  } satisfies IRedditCloneReportSnapshot.IRequest;
  const pendingResult =
    await api.functional.redditClone.admin.reports_snapshots.index(
      adminConnection,
      { body: pendingFilter },
    );
  typia.assert(pendingResult);
  // Validate all returned snapshots have status='pending'
  TestValidator.predicate(
    "all snapshots have pending status",
    pendingResult.data.every((snapshot) => snapshot.status === "pending"),
  );
  // 4. Test filtering by status='dismissed'
  const dismissedFilter = {
    status: "dismissed" as const,
    limit: 20,
  } satisfies IRedditCloneReportSnapshot.IRequest;
  const dismissedResult =
    await api.functional.redditClone.admin.reports_snapshots.index(
      adminConnection,
      { body: dismissedFilter },
    );
  typia.assert(dismissedResult);
  // Validate all returned snapshots have status='dismissed'
  TestValidator.predicate(
    "all snapshots have dismissed status",
    dismissedResult.data.every((snapshot) => snapshot.status === "dismissed"),
  );
  // 5. Test combined filtering: status + community_id
  // Use a community_id from one of the approved snapshots if available
  if (approvedResult.data.length > 0) {
    const targetCommunityId = approvedResult.data[0].community.id;
    const combinedFilter = {
      status: "approved" as const,
      community_id: targetCommunityId,
      limit: 20,
    } satisfies IRedditCloneReportSnapshot.IRequest;
    const combinedResult =
      await api.functional.redditClone.admin.reports_snapshots.index(
        adminConnection,
        { body: combinedFilter },
      );
    typia.assert(combinedResult);
    // Validate all snapshots match both filters
    TestValidator.predicate(
      "combined filter: all snapshots have approved status",
      combinedResult.data.every((snapshot) => snapshot.status === "approved"),
    );
    TestValidator.predicate(
      "combined filter: all snapshots belong to target community",
      combinedResult.data.every(
        (snapshot) => snapshot.community.id === targetCommunityId,
      ),
    );
    // Combined result should be subset of approved result
    TestValidator.predicate(
      "combined result is subset of approved result",
      combinedResult.data.length <= approvedResult.data.length,
    );
  }
  // 6. Test filtering by community_id only
  if (approvedResult.data.length > 0) {
    const targetCommunityId = approvedResult.data[0].community.id;
    const communityFilter = {
      community_id: targetCommunityId,
      limit: 20,
    } satisfies IRedditCloneReportSnapshot.IRequest;
    const communityResult =
      await api.functional.redditClone.admin.reports_snapshots.index(
        adminConnection,
        { body: communityFilter },
      );
    typia.assert(communityResult);
    // Validate all snapshots belong to target community
    TestValidator.predicate(
      "all snapshots belong to target community",
      communityResult.data.every(
        (snapshot) => snapshot.community.id === targetCommunityId,
      ),
    );
  }
  // 7. Verify relationship objects are properly populated
  if (approvedResult.data.length > 0) {
    const sampleSnapshot = approvedResult.data[0];
    // Verify reporter object exists and has required fields
    TestValidator.predicate(
      "reporter object has id",
      sampleSnapshot.reporter.id !== undefined,
    );
    TestValidator.predicate(
      "reporter object has username",
      sampleSnapshot.reporter.username !== undefined,
    );
    TestValidator.predicate(
      "reporter object has display_name",
      sampleSnapshot.reporter.display_name !== undefined,
    );
    // Verify community object exists and has required fields
    TestValidator.predicate(
      "community object has id",
      sampleSnapshot.community.id !== undefined,
    );
    TestValidator.predicate(
      "community object has name",
      sampleSnapshot.community.name !== undefined,
    );
    TestValidator.predicate(
      "community object has owner",
      sampleSnapshot.community.owner !== undefined,
    );
  }
  // 8. Test pagination
  const paginationTest = {
    page: 1,
    limit: 10,
  } satisfies IRedditCloneReportSnapshot.IRequest;
  const page1Result =
    await api.functional.redditClone.admin.reports_snapshots.index(
      adminConnection,
      { body: paginationTest },
    );
  typia.assert(page1Result);
  TestValidator.equals(
    "pagination current page is 1",
    page1Result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 10",
    page1Result.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination data length does not exceed limit",
    page1Result.data.length <= 10,
  );
}
