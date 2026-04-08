import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformPost";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformGuest";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_posts_top_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest session for unauthenticated access
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: {
      fingerprint: typia.random<string>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(guestAuthorized);
  // 2. Fetch posts with different time ranges and validate sorting
  const timeRanges = ["today", "week", "month", "year", "all"] as const;
  for (const timeRange of timeRanges) {
    const response = await api.functional.redditPlatform.guest.posts.index(
      guestConnection,
      {
        body: {
          page: 1,
          limit: 20,
          sort: "top" as const,
          topTimeRange: timeRange,
        },
      },
    );
    typia.assert(response);
    // 3. Validate response structure
    TestValidator.equals(
      `${timeRange} has pagination`,
      response.pagination,
      undefined,
      (key) => key === "pagination",
    );
    TestValidator.equals(
      `${timeRange} has data array`,
      response.data,
      undefined,
      (key) => key === "data",
    );
    // 4. Validate empty response case
    if (response.data.length === 0) {
      TestValidator.equals(
        `${timeRange} empty data`,
        response.pagination.records,
        0,
      );
      continue;
    }
    // 5. Validate sorting - ensure descending by score within time range
    for (let i = 1; i < response.data.length; i++) {
      const prevScore =
        response.data[i - 1].upvotes_count -
        response.data[i - 1].downvotes_count;
      const currScore =
        response.data[i].upvotes_count - response.data[i].downvotes_count;
      TestValidator.predicate(
        `${timeRange} sort order at index ${i}`,
        prevScore >= currScore,
      );
    }
    // 6. Validate pagination metadata
    TestValidator.predicate(
      `${timeRange} pagination current >= 1`,
      response.pagination.current >= 1,
    );
    TestValidator.predicate(
      `${timeRange} pagination records >= 0`,
      response.pagination.records >= 0,
    );
    TestValidator.predicate(
      `${timeRange} pagination limit >= 1`,
      response.pagination.limit >= 1,
    );
    TestValidator.predicate(
      `${timeRange} pagination pages >= 0`,
      response.pagination.pages >= 0,
    );
    // 7. Validate record count matches data length (for single page)
    if (response.pagination.current === 1 && response.pagination.limit === 20) {
      TestValidator.equals(
        `${timeRange} record count matches data length`,
        response.pagination.records,
        response.data.length,
      );
    }
  }
}
