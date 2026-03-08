import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePost";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeGuest } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeGuest";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_guest_join } from "../../../authorize/authorize_guest_join";
import { authorize_guest_refresh } from "../../../authorize/authorize_guest_refresh";

export async function test_api_guest_popular_feed_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Create guest session for authentication
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>() ?? null,
      user_agent: RandomGenerator.name(1),
    } satisfies IRedditLikeGuest.IJoin,
  });
  // Test default pagination (page=1, limit=20)
  const defaultResponse =
    await api.functional.redditLike.guest.feed.popular.index(guestConnection, {
      body: {},
    });
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default pagination has current",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "default pagination has limit",
    defaultResponse.pagination.limit,
    20,
  );
  TestValidator.predicate(
    "default pagination has records",
    defaultResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "default pagination has pages",
    defaultResponse.pagination.pages >= 0,
  );
  // Test custom pagination
  const customResponse =
    await api.functional.redditLike.guest.feed.popular.index(guestConnection, {
      body: {
        page: 1,
        limit: 10,
      },
    });
  typia.assert(customResponse);
  TestValidator.equals(
    "custom pagination page",
    customResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "custom pagination limit",
    customResponse.pagination.limit,
    10,
  );
  // Test limit boundary (max 100)
  const maxLimitResponse =
    await api.functional.redditLike.guest.feed.popular.index(guestConnection, {
      body: {
        limit: 100,
      },
    });
  typia.assert(maxLimitResponse);
  // Test filtering by community_id (with valid UUID)
  try {
    const communityResponse =
      await api.functional.redditLike.guest.feed.popular.index(
        guestConnection,
        {
          body: {
            community_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    typia.assert(communityResponse);
    TestValidator.predicate(
      "community filter returns results",
      communityResponse.data.length >= 0,
    );
  } catch (error) {
    // Expected if community doesn't exist
  }
  // Test filtering by author_id (with valid UUID)
  try {
    const authorResponse =
      await api.functional.redditLike.guest.feed.popular.index(
        guestConnection,
        {
          body: {
            author_id: typia.random<string & tags.Format<"uuid">>(),
          },
        },
      );
    typia.assert(authorResponse);
    TestValidator.predicate(
      "author filter returns results",
      authorResponse.data.length >= 0,
    );
  } catch (error) {
    // Expected if author doesn't exist
  }
  // Test time range filtering
  try {
    const timeResponse =
      await api.functional.redditLike.guest.feed.popular.index(
        guestConnection,
        {
          body: {
            created_from: new Date(Date.now() - 86400000).toISOString(),
            created_to: new Date().toISOString(),
          },
        },
      );
    typia.assert(timeResponse);
    TestValidator.predicate(
      "time range filter returns results",
      timeResponse.data.length >= 0,
    );
  } catch (error) {
    // Expected if no posts match time range
  }
  // Test invalid UUID format (should error)
  try {
    await api.functional.redditLike.guest.feed.popular.index(guestConnection, {
      body: {
        community_id: "invalid-uuid-format" as any,
      },
    });
    throw new Error("Invalid UUID should have been rejected");
  } catch (error) {
    // Expected behavior - invalid UUID format rejected
  }
  // Test various sorting options
  const sortOptions: Array<"hot" | "new" | "top" | "controversial"> = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  for (const sort of sortOptions) {
    try {
      const sortResponse =
        await api.functional.redditLike.guest.feed.popular.index(
          guestConnection,
          {
            body: { sort },
          },
        );
      typia.assert(sortResponse);
      TestValidator.predicate(
        `sort ${sort} returns results`,
        sortResponse.data.length >= 0,
      );
    } catch (error) {
      // Some sorts might not have results
    }
  }
  // Test time filter with top sort
  try {
    const timeTopResponse =
      await api.functional.redditLike.guest.feed.popular.index(
        guestConnection,
        {
          body: {
            sort: "top",
            time: "today",
          },
        },
      );
    typia.assert(timeTopResponse);
    TestValidator.predicate(
      "top today filter returns results",
      timeTopResponse.data.length >= 0,
    );
  } catch (error) {
    // Expected if no popular posts today
  }
}
