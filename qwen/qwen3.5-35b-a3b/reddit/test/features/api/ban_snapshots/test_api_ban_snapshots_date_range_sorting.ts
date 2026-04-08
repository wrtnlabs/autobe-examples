import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformBanRecordSnapshot";
import type { IRedditPlatformBanRecordSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBanRecordSnapshot";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";

export async function test_api_ban_snapshots_date_range_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username:
        RandomGenerator.alphaNumeric(8) + "_" + RandomGenerator.alphaNumeric(3),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Update connection with member's auth token
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = memberAuth.token.access;
  // 2. Test default sorting (snapshot_created_at, desc)
  const defaultSort =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          sort_by: "snapshot_created_at",
          sort_order: "desc",
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(defaultSort);
  // Validate pagination structure
  TestValidator.equals(
    "pagination has current",
    defaultSort.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination has limit",
    defaultSort.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination has records",
    defaultSort.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination has pages",
    defaultSort.pagination.pages >= 0,
    true,
  );
  // 3. Test sorting by banned_at (ascending)
  const bannedAtAsc =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          sort_by: "banned_at",
          sort_order: "asc",
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(bannedAtAsc);
  // 4. Test sorting by banned_at (descending)
  const bannedAtDesc =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          sort_by: "banned_at",
          sort_order: "desc",
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(bannedAtDesc);
  // 5. Test sorting by unbanned_at (ascending)
  const unbannedAtAsc =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          sort_by: "unbanned_at",
          sort_order: "asc",
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(unbannedAtAsc);
  // 6. Test sorting by unbanned_at (descending)
  const unbannedAtDesc =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          sort_by: "unbanned_at",
          sort_order: "desc",
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(unbannedAtDesc);
  // 7. Test date range filtering: banned_at_start and banned_at_end
  const now = new Date();
  const pastDate = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const bannedAtRange =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          banned_at_start: pastDate.toISOString(),
          banned_at_end: now.toISOString(),
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(bannedAtRange);
  // 8. Test date range filtering: unbanned_at_start and unbanned_at_end
  const unbannedAtRange =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          unbanned_at_start: pastDate.toISOString(),
          unbanned_at_end: now.toISOString(),
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(unbannedAtRange);
  // 9. Test partial date range: banned_at_start only
  const bannedAtStartOnly =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          banned_at_start: pastDate.toISOString(),
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(bannedAtStartOnly);
  // 10. Test partial date range: banned_at_end only
  const bannedAtEndOnly =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          banned_at_end: now.toISOString(),
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(bannedAtEndOnly);
  // 11. Test partial date range: unbanned_at_start only
  const unbannedAtStartOnly =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          unbanned_at_start: pastDate.toISOString(),
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(unbannedAtStartOnly);
  // 12. Test partial date range: unbanned_at_end only
  const unbannedAtEndOnly =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          unbanned_at_end: now.toISOString(),
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(unbannedAtEndOnly);
  // 13. Test combined filter and sort
  const combinedFilterSort =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          banned_at_start: pastDate.toISOString(),
          banned_at_end: now.toISOString(),
          sort_by: "snapshot_created_at",
          sort_order: "desc",
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(combinedFilterSort);
  // 14. Test pagination with different limit
  const customLimit =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          limit: 50,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(customLimit);
  TestValidator.equals(
    "custom limit applied",
    customLimit.pagination.limit,
    50,
  );
  // 15. Test pagination with custom page
  const customPage =
    await api.functional.redditPlatform.member.ban_snapshots.index(
      memberConnection,
      {
        body: {
          page: 2,
          limit: 10,
        } satisfies IRedditPlatformBanRecordSnapshot.IRequest,
      },
    );
  typia.assert(customPage);
  TestValidator.equals("custom page applied", customPage.pagination.current, 2);
  TestValidator.equals("custom page limit", customPage.pagination.limit, 10);
  // 16. Verify snapshot data structure
  if (defaultSort.data.length > 0) {
    const snapshot = defaultSort.data[0];
    TestValidator.equals("snapshot has id", snapshot.id !== undefined, true);
    TestValidator.equals(
      "snapshot has reason",
      snapshot.reason !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has banned_at",
      snapshot.banned_at !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has snapshot_created_at",
      snapshot.snapshot_created_at !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has user",
      snapshot.user !== undefined,
      true,
    );
    TestValidator.equals(
      "snapshot has community",
      snapshot.community !== undefined,
      true,
    );
  }
}
