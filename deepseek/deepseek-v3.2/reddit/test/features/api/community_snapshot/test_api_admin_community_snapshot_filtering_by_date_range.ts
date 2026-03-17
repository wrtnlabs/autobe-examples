import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySnapshot";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunitySnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunitySnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_admin_community_snapshot_filtering_by_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection for snapshot access
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Create member connection for community creation
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  // Create a community as prerequisite for snapshots
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Get the community creation timestamp as reference point
  const communityCreatedAt = new Date(community.created_at);
  // Define date range around community creation
  // Use 1 day before and 1 day after creation
  const oneDayMs = 24 * 60 * 60 * 1000;
  const startDate = new Date(communityCreatedAt.getTime() - oneDayMs);
  const endDate = new Date(communityCreatedAt.getTime() + oneDayMs);
  // Test ascending sort (oldest first)
  const ascendingResult =
    await api.functional.communityPlatform.admin.snapshots.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          created_at_start: startDate.toISOString(),
          created_at_end: endDate.toISOString(),
          ascending: true,
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(ascendingResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    ascendingResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    ascendingResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    ascendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    ascendingResult.pagination.pages >= 0,
  );
  // Validate ascending order if we have enough snapshots
  if (ascendingResult.data.length > 1) {
    for (let i = 1; i < ascendingResult.data.length; i++) {
      const prev = new Date(ascendingResult.data[i - 1].created_at);
      const curr = new Date(ascendingResult.data[i].created_at);
      TestValidator.predicate(
        "ascending order: previous <= current",
        prev <= curr,
      );
    }
  }
  // Validate date range filtering for ascending results
  for (const snapshot of ascendingResult.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      "snapshot date within start range",
      snapshotDate >= startDate,
    );
    TestValidator.predicate(
      "snapshot date within end range",
      snapshotDate <= endDate,
    );
  }
  // Test descending sort (newest first)
  const descendingResult =
    await api.functional.communityPlatform.admin.snapshots.index(
      adminConnection,
      {
        communityId: community.id,
        body: {
          created_at_start: startDate.toISOString(),
          created_at_end: endDate.toISOString(),
          ascending: false,
          page: 1,
          limit: typia.random<
            number & tags.Type<"int32"> & tags.Minimum<1> & tags.Maximum<100>
          >(),
        } satisfies ICommunityPlatformCommunitySnapshot.IRequest,
      },
    );
  typia.assert(descendingResult);
  // Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is 1",
    descendingResult.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    descendingResult.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    descendingResult.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    descendingResult.pagination.pages >= 0,
  );
  // Validate descending order if we have enough snapshots
  if (descendingResult.data.length > 1) {
    for (let i = 1; i < descendingResult.data.length; i++) {
      const prev = new Date(descendingResult.data[i - 1].created_at);
      const curr = new Date(descendingResult.data[i].created_at);
      TestValidator.predicate(
        "descending order: previous >= current",
        prev >= curr,
      );
    }
  }
}