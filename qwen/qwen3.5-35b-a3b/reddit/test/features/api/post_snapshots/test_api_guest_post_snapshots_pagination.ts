import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPostSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_snapshots_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for anonymous browsing
  const guestConnection: api.IConnection = { host: connection.host };
  const guestSession = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(guestSession);
  guestConnection.headers = {
    Authorization: guestSession.token.access,
  };
  // 2. Define date range filters for January 2024
  const created_at_min = "2024-01-01T00:00:00Z";
  const created_at_max = "2024-01-31T23:59:59Z";
  // 3. Fetch first page with date range and sorting
  const firstPage =
    await api.functional.redditPlatform.guest.post_snapshots.index(
      guestConnection,
      {
        body: {
          created_at_min,
          created_at_max,
          sortBy: "snapshot_type",
          sortOrder: "asc",
          limit: 20,
        } satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(firstPage);
  // 4. Validate first page data and metadata
  TestValidator.equals("page number is 1", firstPage.pagination.current, 1);
  TestValidator.equals("limit is 20", firstPage.pagination.limit, 20);
  TestValidator.predicate(
    "records count positive",
    firstPage.pagination.records > 0,
  );
  TestValidator.predicate(
    "pages calculated correctly",
    firstPage.pagination.pages > 0,
  );
  // Validate all snapshots are within date range
  const dateRangeValid = firstPage.data.every((snapshot) => {
    const createdAt = new Date(snapshot.created_at).getTime();
    const minDate = new Date(created_at_min).getTime();
    const maxDate = new Date(created_at_max).getTime();
    return createdAt >= minDate && createdAt <= maxDate;
  });
  TestValidator.predicate("all snapshots within date range", dateRangeValid);
  // 5. Validate sorting by snapshot_type (ascending)
  const snapshotsByType = new Map<string, number>();
  let prevType: string | undefined;
  for (const snapshot of firstPage.data) {
    snapshotsByType.set(
      snapshot.snapshot_type,
      (snapshotsByType.get(snapshot.snapshot_type) ?? 0) + 1,
    );
    if (prevType !== undefined) {
      TestValidator.predicate(
        "sorting is ascending",
        snapshot.snapshot_type >= prevType,
      );
    }
    prevType = snapshot.snapshot_type;
  }
  TestValidator.predicate("all snapshot types found", snapshotsByType.size > 0);
  // 6. Extract cursor from last record for pagination
  const lastRecord = firstPage.data[firstPage.data.length - 1];
  const cursor = Buffer.from(
    `${lastRecord.created_at}|${lastRecord.id}`,
  ).toString("base64");
  TestValidator.predicate(
    "cursor exists for pagination",
    cursor !== undefined && cursor.length > 0,
  );
  // 7. Fetch second page using cursor
  const secondPage =
    await api.functional.redditPlatform.guest.post_snapshots.index(
      guestConnection,
      {
        body: {
          created_at_min,
          created_at_max,
          sortBy: "snapshot_type",
          sortOrder: "asc",
          limit: 20,
          cursor,
        } satisfies IRedditPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(secondPage);
  // 8. Validate second page metadata
  TestValidator.equals("page number is 2", secondPage.pagination.current, 2);
  TestValidator.equals("limit is still 20", secondPage.pagination.limit, 20);
  TestValidator.notEquals(
    "records count differs",
    firstPage.pagination.records,
    secondPage.pagination.records,
  );
  // 9. Validate no duplicate records between pages
  const firstPageIds = new Set(firstPage.data.map((s) => s.id));
  const secondPageIds = new Set(secondPage.data.map((s) => s.id));
  const duplicateIds = Array.from(secondPageIds).filter((id) =>
    firstPageIds.has(id),
  );
  TestValidator.equals("no duplicate records", duplicateIds.length, 0);
  // 10. Validate pagination continuity (second page starts after last first page record)
  if (secondPage.data.length > 0) {
    const secondPageFirstRecord = secondPage.data[0];
    const isAfterFirstPageLast =
      new Date(secondPageFirstRecord.created_at) >
      new Date(lastRecord.created_at);
    TestValidator.predicate(
      "second page after first page",
      isAfterFirstPageLast,
    );
  }
  // 11. Validate all snapshots have required fields
  for (const snapshot of [...firstPage.data, ...secondPage.data]) {
    TestValidator.predicate("snapshot has id", snapshot.id !== undefined);
    TestValidator.predicate("snapshot has title", snapshot.title !== undefined);
    TestValidator.predicate(
      "snapshot has author",
      snapshot.author !== undefined,
    );
    TestValidator.predicate(
      "snapshot has community",
      snapshot.community !== undefined,
    );
    TestValidator.predicate("snapshot has score", snapshot.score !== undefined);
    TestValidator.predicate(
      "snapshot has created_at",
      snapshot.created_at !== undefined,
    );
    TestValidator.predicate(
      "snapshot has snapshot_type",
      snapshot.snapshot_type !== undefined,
    );
    // Validate author has required fields
    TestValidator.predicate("author has id", snapshot.author.id !== undefined);
    TestValidator.predicate(
      "author has username",
      snapshot.author.username !== undefined,
    );
    TestValidator.predicate(
      "author has karma",
      snapshot.author.karma !== undefined,
    );
    TestValidator.predicate(
      "author has created_at",
      snapshot.author.created_at !== undefined,
    );
    // Validate community has required fields
    TestValidator.predicate(
      "community has id",
      snapshot.community.id !== undefined,
    );
    TestValidator.predicate(
      "community has name",
      snapshot.community.name !== undefined,
    );
    TestValidator.predicate(
      "community has owner",
      snapshot.community.owner !== undefined,
    );
    // Validate score calculation
    const calculatedScore = snapshot.upvotes_count - snapshot.downvotes_count;
    TestValidator.equals(
      "score matches calculation",
      snapshot.score,
      calculatedScore,
    );
    // Validate timestamps are ISO 8601
    const parsedCreatedAt = new Date(snapshot.created_at);
    TestValidator.predicate(
      "created_at is valid date",
      !isNaN(parsedCreatedAt.getTime()),
    );
  }
}
