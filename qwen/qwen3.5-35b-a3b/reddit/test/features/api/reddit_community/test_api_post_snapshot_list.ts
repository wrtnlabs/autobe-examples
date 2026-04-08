import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityAdmin";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_post_snapshot_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
    } satisfies IRedditCommunityAdmin.IJoin,
  });
  typia.assert(admin);
  // Update connection with admin token for subsequent API calls
  const adminAuthorizedConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...adminConnection.headers,
      Authorization: admin.token.access,
    },
  };
  // 2. Create pagination and sorting request
  const request = {
    page: 1,
    limit: 20,
    sortBy: "created_at" as const,
    sortOrder: "desc" as const,
  } satisfies IRedditCommunityPostSnapshot.IRequest;
  // 3. Fetch paginated snapshots
  const snapshots = await api.functional.redditCommunity.admin.snapshots.index(
    adminAuthorizedConnection,
    { body: request },
  );
  typia.assert(snapshots);
  // 4. Validate response structure
  TestValidator.equals(
    "pagination current page is 1",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit is 20",
    snapshots.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "pagination records is non-negative",
    snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages is non-negative",
    snapshots.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "pagination pages matches calculation",
    snapshots.pagination.pages ===
      Math.ceil(snapshots.pagination.records / snapshots.pagination.limit),
  );
  // 5. Validate snapshots are sorted by created_at descending
  if (snapshots.data.length > 1) {
    for (let i = 1; i < snapshots.data.length; i++) {
      const prevCreated = new Date(snapshots.data[i - 1].created_at);
      const currCreated = new Date(snapshots.data[i].created_at);
      TestValidator.predicate(
        `snapshots are sorted descending at index ${i}`,
        prevCreated >= currCreated,
      );
    }
  }
  // 6. Validate snapshot summary structure (typia.assert validates types)
  for (const snapshot of snapshots.data) {
    typia.assert(snapshot);
    // Validate author and community exist and are properly structured
    typia.assert(snapshot.author);
    typia.assert(snapshot.community);
    // Validate snapshot has expected fields
    TestValidator.predicate(
      "snapshot has non-empty title",
      snapshot.title.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid post_type",
      snapshot.post_type.length > 0,
    );
    TestValidator.predicate(
      "snapshot has valid status",
      snapshot.status.length > 0,
    );
  }
}
