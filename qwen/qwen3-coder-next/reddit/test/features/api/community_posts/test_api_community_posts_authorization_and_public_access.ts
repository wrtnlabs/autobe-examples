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

export async function test_api_community_posts_authorization_and_public_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Test unauthenticated access (public endpoint)
  const randomCommunityName = `community-${RandomGenerator.alphabets(8)}`;
  const publicResponse =
    await api.functional.redditLike.communities.posts.index(connection, {
      communityId: randomCommunityName,
      body: {
        limit: 10,
        page: 1,
      },
    });
  typia.assert(publicResponse);
  TestValidator.predicate(
    "unauthenticated access returns response",
    publicResponse !== null,
  );
  TestValidator.predicate(
    "unauthenticated access has pagination",
    publicResponse.pagination !== undefined,
  );
  // 2. Test authenticated guest access
  const guestConnection: api.IConnection = { host: connection.host };
  const guestAuthorized = await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditLikeGuest.IJoin>(),
  });
  const guestResponse = await api.functional.redditLike.communities.posts.index(
    guestConnection,
    {
      communityId: randomCommunityName,
      body: {
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(guestResponse);
  TestValidator.equals(
    "guest access pagination matches public",
    guestResponse.pagination.current,
    publicResponse.pagination.current,
  );
  // 3. Test pagination with different limits
  const smallLimitResponse =
    await api.functional.redditLike.communities.posts.index(connection, {
      communityId: randomCommunityName,
      body: {
        limit: 2,
        page: 1,
      },
    });
  typia.assert(smallLimitResponse);
  TestValidator.predicate(
    "small limit respects constraint",
    smallLimitResponse.data.length <= 2,
  );
  const maxLimitResponse =
    await api.functional.redditLike.communities.posts.index(connection, {
      communityId: randomCommunityName,
      body: {
        limit: 100,
        page: 1,
      },
    });
  typia.assert(maxLimitResponse);
  // 4. Test different sorting options
  const sortOptions: Array<"hot" | "new" | "top" | "controversial"> = [
    "hot",
    "new",
    "top",
    "controversial",
  ];
  for (const sort of sortOptions) {
    const sortedResponse =
      await api.functional.redditLike.communities.posts.index(connection, {
        communityId: randomCommunityName,
        body: {
          sort: sort,
          limit: 5,
          page: 1,
        },
      });
    typia.assert(sortedResponse);
  }
  // 5. Test time range filtering for top-sorted feeds
  const timeOptions: Array<"today" | "week" | "month" | "year" | "all"> = [
    "today",
    "week",
    "month",
    "year",
    "all",
  ];
  for (const time of timeOptions) {
    const timeFilteredResponse =
      await api.functional.redditLike.communities.posts.index(connection, {
        communityId: randomCommunityName,
        body: {
          sort: "top",
          time: time,
          limit: 5,
          page: 1,
        },
      });
    typia.assert(timeFilteredResponse);
  }
  // 6. Test community and author filtering with valid UUIDs
  const validCommunityId = "00000000-0000-0000-0000-000000000000";
  const validAuthorId = "00000000-0000-0000-0000-000000000000";
  const communityFilterResponse =
    await api.functional.redditLike.communities.posts.index(connection, {
      communityId: randomCommunityName,
      body: {
        community_id: validCommunityId,
        limit: 10,
        page: 1,
      },
    });
  typia.assert(communityFilterResponse);
  const authorFilterResponse =
    await api.functional.redditLike.communities.posts.index(connection, {
      communityId: randomCommunityName,
      body: {
        author_id: validAuthorId,
        limit: 10,
        page: 1,
      },
    });
  typia.assert(authorFilterResponse);
  // 7. Test time range filtering by creation timestamp
  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const timeRangeResponse =
    await api.functional.redditLike.communities.posts.index(connection, {
      communityId: randomCommunityName,
      body: {
        created_from: weekAgo.toISOString(),
        created_to: now.toISOString(),
        limit: 10,
        page: 1,
      },
    });
  typia.assert(timeRangeResponse);
  // 8. Test empty community handling
  const emptyCommunityName = `empty-${RandomGenerator.alphabets(8)}`;
  const emptyResponse = await api.functional.redditLike.communities.posts.index(
    connection,
    {
      communityId: emptyCommunityName,
      body: {
        limit: 10,
        page: 1,
      },
    },
  );
  typia.assert(emptyResponse);
  TestValidator.equals(
    "empty community returns empty list",
    emptyResponse.data.length,
    0,
  );
  // 9. Test default pagination values
  const defaultResponse =
    await api.functional.redditLike.communities.posts.index(connection, {
      communityId: randomCommunityName,
      body: {},
    });
  typia.assert(defaultResponse);
  TestValidator.equals(
    "default page is 1",
    defaultResponse.pagination.current,
    1,
  );
  TestValidator.equals("default limit", defaultResponse.pagination.limit, 10);
}
