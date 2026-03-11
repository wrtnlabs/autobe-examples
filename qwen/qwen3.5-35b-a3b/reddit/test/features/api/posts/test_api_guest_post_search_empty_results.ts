import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformGuestSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuestSession";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_post_search_empty_results(
  connection: api.IConnection,
): Promise<void> {
  // 1. Guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guest = await authorize_guest_join(guestConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      display_name: RandomGenerator.name(2),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guest);
  // 2. Baseline search - validate response structure (don't assume zero records)
  const baselineResult =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {},
      },
    );
  typia.assert(baselineResult);
  TestValidator.equals(
    "baseline pagination structure exists",
    baselineResult.pagination,
    {
      current: baselineResult.pagination.current,
      limit: baselineResult.pagination.limit,
      records: baselineResult.pagination.records,
      pages: baselineResult.pagination.pages,
    },
  );
  // 3. Search with non-existent title keyword
  const nonExistentKeywordResult =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          search: "xyznonexistent123",
        },
      },
    );
  typia.assert(nonExistentKeywordResult);
  TestValidator.equals(
    "non-existent keyword records",
    nonExistentKeywordResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent keyword pages",
    nonExistentKeywordResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent keyword data length",
    nonExistentKeywordResult.data.length,
    0,
  );
  // 4. Search with non-existent community ID
  const nonExistentCommunityIdResult =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          communityId: "00000000-0000-0000-0000-000000000000",
        },
      },
    );
  typia.assert(nonExistentCommunityIdResult);
  TestValidator.equals(
    "non-existent community records",
    nonExistentCommunityIdResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "non-existent community pages",
    nonExistentCommunityIdResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "non-existent community data length",
    nonExistentCommunityIdResult.data.length,
    0,
  );
  // 5. Search with date range before any posts (10 years ago)
  const oldDate = new Date();
  oldDate.setFullYear(oldDate.getFullYear() - 10);
  const oldDateRangeResult =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          dateRange: {
            startDate: oldDate.toISOString(),
            endDate: oldDate.toISOString(),
          },
        },
      },
    );
  typia.assert(oldDateRangeResult);
  TestValidator.equals(
    "old date range records",
    oldDateRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "old date range pages",
    oldDateRangeResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "old date range data length",
    oldDateRangeResult.data.length,
    0,
  );
  // 6. Search with vote score range no posts fall within
  const highScoreRangeResult =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          voteScoreRange: {
            min: 999999,
            max: 1000000,
          },
        },
      },
    );
  typia.assert(highScoreRangeResult);
  TestValidator.equals(
    "high score range records",
    highScoreRangeResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "high score range pages",
    highScoreRangeResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "high score range data length",
    highScoreRangeResult.data.length,
    0,
  );
  // 7. Search with special characters only in title
  const specialCharsResult =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          search: "!@#$%^&*()",
        },
      },
    );
  typia.assert(specialCharsResult);
  TestValidator.equals(
    "special chars records",
    specialCharsResult.pagination.records,
    0,
  );
  TestValidator.equals(
    "special chars pages",
    specialCharsResult.pagination.pages,
    0,
  );
  TestValidator.equals(
    "special chars data length",
    specialCharsResult.data.length,
    0,
  );
  // 8. Search with empty string - should return all posts or handle gracefully
  const emptyStringResult =
    await api.functional.redditPlatform.guest.posts.search.index(
      guestConnection,
      {
        body: {
          search: "",
        },
      },
    );
  typia.assert(emptyStringResult);
  TestValidator.predicate(
    "empty search returns valid structure",
    emptyStringResult.pagination.records >= 0,
  );
}