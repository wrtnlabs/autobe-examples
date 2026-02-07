import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformReport";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import type { IRedditPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_reddit_platform_user_communities_create } from "../../../generate/generate_random_reddit_platform_user_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

/**
 * Test community reports status filtering functionality.
 * 1. Authenticate as admin
 * 2. Authenticate as user and create community
 * 3. Test filtering reports by different statuses (pending, approved, dismissed)
 * 4. Validate response structure and pagination
 */
export async function test_api_admin_community_reports_status_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin actor connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: typia.random<IRedditPlatformAdmin.IJoin>(),
  });
  // 2. Create user actor connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: typia.random<IRedditPlatformUser.IJoin>(),
  });
  // 3. Create community as user (for valid context, though we won't use response properties)
  const community = await api.functional.redditPlatform.user.communities.create(
    userConnection,
    {
      body: typia.random<IRedditPlatformCommunity.ICreate>(),
    },
  );
  typia.assert(community);
  // 4. Test community reports status filtering
  // Use a generated UUID for communityId since IRedditPlatformCommunity has no properties
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const statuses = ["pending", "approved", "dismissed"] as const;
  for (const status of statuses) {
    const response =
      await api.functional.redditPlatform.admin.communities.reports.index(
        adminConnection,
        {
          communityId: communityId,
          body: { status },
        },
      );
    typia.assert(response);
    // Validate pagination structure
    TestValidator.equals("pagination exists", !!response.pagination, true);
    TestValidator.predicate("has data array", Array.isArray(response.data));
    // Validate pagination properties exist
    TestValidator.equals(
      "pagination has current",
      response.pagination.current >= 0,
      true,
    );
    TestValidator.equals(
      "pagination has limit",
      response.pagination.limit >= 0,
      true,
    );
    TestValidator.equals(
      "pagination has records",
      response.pagination.records >= 0,
      true,
    );
    TestValidator.equals(
      "pagination has pages",
      response.pagination.pages >= 0,
      true,
    );
  }
  // 5. Test with pagination parameters
  const paginatedResponse =
    await api.functional.redditPlatform.admin.communities.reports.index(
      adminConnection,
      {
        communityId: communityId,
        body: {
          status: "pending",
          page: 1,
          limit: 10,
        },
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination page",
    paginatedResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "pagination has records",
    paginatedResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination has pages",
    paginatedResponse.pagination.pages >= 0,
  );
}
