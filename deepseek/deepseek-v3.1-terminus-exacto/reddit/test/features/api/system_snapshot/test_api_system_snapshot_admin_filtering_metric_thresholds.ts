import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformSystemSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformSystemSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_system_snapshot_admin_filtering_metric_thresholds(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Test 1: Basic metric filtering with multiple constraints
  const totalUsersMin = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const totalUsersMax =
    totalUsersMin +
    typia.random<
      number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<1000>
    >();
  const engagementRateMin = typia.random<
    number & tags.Minimum<0> & tags.Maximum<50>
  >();
  const engagementRateMax =
    engagementRateMin +
    typia.random<number & tags.Minimum<1> & tags.Maximum<50>>();
  const request1: ICommunityPlatformSystemSnapshot.IRequest = {
    total_users_min: totalUsersMin,
    total_users_max: totalUsersMax,
    engagement_rate_min: engagementRateMin,
    engagement_rate_max: engagementRateMax,
    snapshot_period: RandomGenerator.pick([
      "daily",
      "weekly",
      "monthly",
    ] as const),
    page: 1,
    limit: 10,
    sort_by: "total_users",
    sort_order: "desc",
  };
  const response1 =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      { body: request1 },
    );
  typia.assert(response1);
  // Validate pagination
  TestValidator.equals(
    "pagination page should be 1",
    response1.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit should be 10",
    response1.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count should be non-negative",
    response1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count should be non-negative",
    response1.pagination.pages >= 0,
  );
  // Validate each snapshot meets filter criteria
  for (const snapshot of response1.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} total_users should be within range`,
      snapshot.total_users >= request1.total_users_min! &&
        snapshot.total_users <= request1.total_users_max!,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} engagement_rate should be within range`,
      snapshot.engagement_rate >= request1.engagement_rate_min! &&
        snapshot.engagement_rate <= request1.engagement_rate_max!,
    );
  }
  // Test 2: Edge case - equality condition
  const equalValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const request2: ICommunityPlatformSystemSnapshot.IRequest = {
    total_users_min: equalValue,
    total_users_max: equalValue,
    page: 1,
    limit: 5,
  };
  const response2 =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      { body: request2 },
    );
  typia.assert(response2);
  for (const snapshot of response2.data) {
    TestValidator.equals(
      `snapshot ${snapshot.id} total_users should equal ${equalValue}`,
      snapshot.total_users,
      equalValue,
    );
  }
  // Test 3: Only min constraint
  const minOnlyValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<0>
  >();
  const engagementMinOnly = typia.random<
    number & tags.Minimum<0> & tags.Maximum<50>
  >();
  const request3: ICommunityPlatformSystemSnapshot.IRequest = {
    total_users_min: minOnlyValue,
    engagement_rate_min: engagementMinOnly,
    page: 1,
    limit: 3,
  };
  const response3 =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      { body: request3 },
    );
  typia.assert(response3);
  for (const snapshot of response3.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} total_users should be >= ${minOnlyValue}`,
      snapshot.total_users >= request3.total_users_min!,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} engagement_rate should be >= ${engagementMinOnly}`,
      snapshot.engagement_rate >= request3.engagement_rate_min!,
    );
  }
  // Test 4: Only max constraint
  const maxOnlyValue = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1>
  >();
  const engagementMaxOnly = typia.random<
    number & tags.Minimum<1> & tags.Maximum<100>
  >();
  const request4: ICommunityPlatformSystemSnapshot.IRequest = {
    total_users_max: maxOnlyValue,
    engagement_rate_max: engagementMaxOnly,
    page: 1,
    limit: 3,
  };
  const response4 =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      { body: request4 },
    );
  typia.assert(response4);
  for (const snapshot of response4.data) {
    TestValidator.predicate(
      `snapshot ${snapshot.id} total_users should be <= ${maxOnlyValue}`,
      snapshot.total_users <= request4.total_users_max!,
    );
    TestValidator.predicate(
      `snapshot ${snapshot.id} engagement_rate should be <= ${engagementMaxOnly}`,
      snapshot.engagement_rate <= request4.engagement_rate_max!,
    );
  }
  // Test 5: Empty result set with impossible criteria
  const request5: ICommunityPlatformSystemSnapshot.IRequest = {
    total_users_min: 999999999,
    total_users_max: 1000000000,
    engagement_rate_min: 99,
    engagement_rate_max: 100,
    page: 1,
    limit: 10,
  };
  const response5 =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      { body: request5 },
    );
  typia.assert(response5);
  TestValidator.equals(
    "empty result set should have zero data items",
    response5.data.length,
    0,
  );
  TestValidator.equals(
    "empty result set should have zero records",
    response5.pagination.records,
    0,
  );
  TestValidator.equals(
    "empty result set should have zero pages",
    response5.pagination.pages,
    0,
  );
  // Test 6: Verify sorting by total_users descending
  const request6: ICommunityPlatformSystemSnapshot.IRequest = {
    sort_by: "total_users",
    sort_order: "desc",
    page: 1,
    limit: 10,
  };
  const response6 =
    await api.functional.communityPlatform.admin.system_snapshots.index(
      adminConnection,
      { body: request6 },
    );
  typia.assert(response6);
  // Check if results are sorted in descending order
  for (let i = 1; i < response6.data.length; i++) {
    TestValidator.predicate(
      `snapshot ${i} total_users should be <= snapshot ${i - 1} total_users when sorted descending`,
      response6.data[i].total_users <= response6.data[i - 1].total_users,
    );
  }
}
