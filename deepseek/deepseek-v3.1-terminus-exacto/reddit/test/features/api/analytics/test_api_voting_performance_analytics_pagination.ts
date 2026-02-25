import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformVoteKarmaImpact";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformVoteKarmaImpact } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformVoteKarmaImpact";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_voting_performance_analytics_pagination(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using available utility function
  const adminConnection: api.IConnection = { host: connection.host };
  // Use authorize_admin_join utility function which is available
  await authorize_admin_join(adminConnection, {
    body: {
      email: "admin" + Date.now() + "@test.com",
      password: "password123",
      display_name: "Test Admin",
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Test 1: Default pagination (page 1, limit 100)
  const defaultResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_time: new Date().toISOString(),
          granularity: "day",
          page: null,
          limit: null,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page should be 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default limit should be 100",
    defaultResponse.pagination.limit,
    100,
  );
  TestValidator.predicate(
    "total records should be non-negative",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "total pages should be non-negative",
    defaultResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array size should match limit or be smaller",
    defaultResponse.data.length <= defaultResponse.pagination.limit,
  );
  // Test 2: Specific page with custom limit
  const customResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: new Date(
            Date.now() - 30 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_time: new Date().toISOString(),
          granularity: "day",
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(customResponse);
  TestValidator.equals(
    "custom page should be 1",
    customResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom limit should be 10",
    customResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "data array size should match custom limit",
    customResponse.data.length <= customResponse.pagination.limit,
  );
  // Test 3: Boundary conditions - page beyond available data
  const boundaryResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: new Date(
            Date.now() - 7 * 24 * 60 * 60 * 1000,
          ).toISOString(),
          end_time: new Date().toISOString(),
          granularity: "day",
          page: 9999,
          limit: 10,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(boundaryResponse);
  TestValidator.equals(
    "boundary page should be 9999",
    boundaryResponse.pagination.current,
    9999,
  );
  TestValidator.equals(
    "boundary limit should be 10",
    boundaryResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "boundary page should have empty data array",
    boundaryResponse.data.length === 0,
  );
  // Test 4: Different granularity with pagination
  const hourlyResponse =
    await api.functional.communityPlatform.admin.analytics.voting_performance.index(
      adminConnection,
      {
        body: {
          start_time: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
          end_time: new Date().toISOString(),
          granularity: "hour",
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
      },
    );
  typia.assert(hourlyResponse);
  TestValidator.equals(
    "hourly page should be 1",
    hourlyResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "hourly limit should be 5",
    hourlyResponse.pagination.limit,
    5,
  );
  TestValidator.predicate(
    "hourly data array size should match limit",
    hourlyResponse.data.length <= hourlyResponse.pagination.limit,
  );
  // Test 5: Validate pagination calculations
  if (
    defaultResponse.pagination.records > 0 &&
    defaultResponse.pagination.pages > 0
  ) {
    const expectedPages = Math.ceil(
      defaultResponse.pagination.records / defaultResponse.pagination.limit,
    );
    TestValidator.equals(
      "page calculation should be correct",
      defaultResponse.pagination.pages,
      expectedPages,
    );
  }
  // Test 6: Last page validation
  if (customResponse.pagination.pages > 1) {
    const lastPageResponse =
      await api.functional.communityPlatform.admin.analytics.voting_performance.index(
        adminConnection,
        {
          body: {
            start_time: new Date(
              Date.now() - 30 * 24 * 60 * 60 * 1000,
            ).toISOString(),
            end_time: new Date().toISOString(),
            granularity: "day",
            page: customResponse.pagination.pages,
            limit: 10,
          } satisfies ICommunityPlatformVoteKarmaImpact.IRequest,
        },
      );
    typia.assert(lastPageResponse);
    TestValidator.equals(
      "last page should match total pages",
      lastPageResponse.pagination.current,
      customResponse.pagination.pages,
    );
    TestValidator.predicate(
      "last page data size should be <= limit",
      lastPageResponse.data.length <= lastPageResponse.pagination.limit,
    );
  }
}
