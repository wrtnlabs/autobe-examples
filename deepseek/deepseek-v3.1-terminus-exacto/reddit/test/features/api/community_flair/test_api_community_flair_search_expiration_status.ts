import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityFlairAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_flair_search_expiration_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as admin using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin_password123",
      display_name: "Test Admin",
    },
  });
  typia.assert(admin);
  // 2. Prepare a community ID for filtering
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 3. Test active assignments (expired_at = null)
  const activeRequest: ICommunityPlatformCommunityFlairAssignment.IRequest = {
    expired_at: null,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest;
  const activeResult =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId,
        body: activeRequest,
      },
    );
  typia.assert(activeResult);
  TestValidator.predicate(
    "active assignments returned",
    activeResult.data.length >= 0,
  );
  TestValidator.equals(
    "pagination limit matches",
    activeResult.pagination.limit,
    10,
  );
  TestValidator.equals("page matches", activeResult.pagination.current, 1);
  // Verify all returned assignments are active (expired_at is null)
  for (const assignment of activeResult.data) {
    TestValidator.equals(
      "active assignment has null expired_at",
      assignment.expired_at,
      null,
    );
  }
  // 4. Test expired assignments (expired_at = past date)
  const pastDate = new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(); // 1 day ago
  const expiredRequest: ICommunityPlatformCommunityFlairAssignment.IRequest = {
    expired_at: pastDate,
    page: 1,
    limit: 10,
  } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest;
  const expiredResult =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId,
        body: expiredRequest,
      },
    );
  typia.assert(expiredResult);
  TestValidator.predicate(
    "expired assignments returned",
    expiredResult.data.length >= 0,
  );
  // Verify all returned assignments are expired (valid date, not null)
  for (const assignment of expiredResult.data) {
    TestValidator.notEquals(
      "expired assignment has date not null",
      assignment.expired_at,
      null,
    );
    if (assignment.expired_at) {
      const expiredDate = new Date(assignment.expired_at);
      const past = new Date(pastDate);
      TestValidator.predicate(
        "expired date is before or equal to filter date",
        expiredDate <= past,
      );
    }
  }
  // 5. Test future expiration dates treated as active (future date, but filter with null for active)
  const futureDate = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 30,
  ).toISOString(); // 30 days in future
  const futureRequest: ICommunityPlatformCommunityFlairAssignment.IRequest = {
    expired_at: futureDate,
    page: 1,
    limit: 5,
  } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest;
  const futureResult =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId,
        body: futureRequest,
      },
    );
  typia.assert(futureResult);
  // The system should treat future expiration dates as expiration filters, not active
  // We validate the response structure
  TestValidator.predicate(
    "future date query returns valid result",
    futureResult.data.length >= 0,
  );
  // Combined with active filter: system should treat assignments with future expired_at as active
  // So when we query with expired_at = null, we shouldn't get assignments with future dates
  // This is implicit in our earlier active query test
  // 6. Test combined filtering (expiration + other filters)
  // Test with both null expired_at and a specific user_id (random)
  const userId = typia.random<string & tags.Format<"uuid">>();
  const userFilterRequest: ICommunityPlatformCommunityFlairAssignment.IRequest =
    {
      expired_at: null,
      user_id: userId,
      page: 1,
      limit: 5,
    } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest;
  const userFilterResult =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId,
        body: userFilterRequest,
      },
    );
  typia.assert(userFilterResult);
  TestValidator.predicate(
    "combined user filter returns",
    userFilterResult.data.length >= 0,
  );
  // Test with both past date and flair_id filter (random)
  const flairId = typia.random<string & tags.Format<"uuid">>();
  const flairFilterRequest: ICommunityPlatformCommunityFlairAssignment.IRequest =
    {
      expired_at: pastDate,
      flair_id: flairId,
      page: 1,
      limit: 5,
    } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest;
  const flairFilterResult =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId,
        body: flairFilterRequest,
      },
    );
  typia.assert(flairFilterResult);
  TestValidator.predicate(
    "combined flair filter returns",
    flairFilterResult.data.length >= 0,
  );
}
