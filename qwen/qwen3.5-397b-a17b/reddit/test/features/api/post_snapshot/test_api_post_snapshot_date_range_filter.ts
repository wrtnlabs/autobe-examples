import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityPostSnapshot";
import type { IRedditCommunityGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityGuest";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_post_snapshot_date_range_filter(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register guest account using utility function
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuth = await authorize_guest_join(guestConnection, {
    body: {
      deviceFingerprint: RandomGenerator.alphaNumeric(32),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityGuest.IJoin,
  });
  typia.assert(guestAuth);
  // 2. Define date range for filtering (7 days before and after current time)
  const now = new Date();
  const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const toDate = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const fromTimestamp = fromDate.toISOString();
  const toTimestamp = toDate.toISOString();
  // 3. Retrieve post snapshots with date range filter
  const postId = typia.random<string & tags.Format<"uuid">>();
  const snapshots =
    await api.functional.redditCommunity.guest.posts.snapshots.index(
      guestConnection,
      {
        postId,
        body: {
          from: fromTimestamp,
          to: toTimestamp,
          page: 1,
          limit: 10,
          sort: "created_at",
          order: "desc",
        } satisfies IRedditCommunityPostSnapshot.IRequest,
      },
    );
  typia.assert(snapshots);
  // 4. Validate all snapshots fall within the specified date range
  for (const snapshot of snapshots.data) {
    const snapshotDate = new Date(snapshot.created_at);
    TestValidator.predicate(
      `snapshot ${snapshot.id} created_at within date range`,
      () => snapshotDate >= fromDate && snapshotDate <= toDate,
    );
  }
  // 5. Validate pagination metadata
  TestValidator.predicate(
    "pagination current page is valid",
    () => snapshots.pagination.current >= 1,
  );
  TestValidator.predicate(
    "pagination limit is valid",
    () => snapshots.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records count is valid",
    () => snapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination pages count is valid",
    () => snapshots.pagination.pages >= 0,
  );
}
