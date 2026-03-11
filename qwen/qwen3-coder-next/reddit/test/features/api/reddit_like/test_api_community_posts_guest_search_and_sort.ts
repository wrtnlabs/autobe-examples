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

export async function test_api_community_posts_guest_search_and_sort(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest authentication for community operations
  const guestConnection: api.IConnection = { host: connection.host };
  const guestUser = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  const guestAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      Authorization: guestUser.token.access,
    },
  };
  // 2. Create community first (using guest connection for community creation)
  const communityName = `test-community-${RandomGenerator.alphaNumeric(8)}`;
  // 3. Create multiple posts with different types
  const textPost =
    await api.functional.redditLike.guest.communities.posts.index(
      guestAuthConnection,
      {
        communityName: communityName,
        body: {
          title: "Test Text Post",
          type: "text" as const,
          content: "This is a test text post content.",
          communityName: communityName,
          page: 1,
          limit: 100,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  const linkPost =
    await api.functional.redditLike.guest.communities.posts.index(
      guestAuthConnection,
      {
        communityName: communityName,
        body: {
          title: "Test Link Post",
          type: "link" as const,
          url: "https://example.com",
          communityName: communityName,
          page: 1,
          limit: 100,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  const imagePost =
    await api.functional.redditLike.guest.communities.posts.index(
      guestAuthConnection,
      {
        communityName: communityName,
        body: {
          title: "Test Image Post",
          type: "image" as const,
          image_url: "https://example.com/image.jpg",
          communityName: communityName,
          page: 1,
          limit: 100,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  // 4. Search by title keyword
  const searchResults =
    await api.functional.redditLike.guest.communities.posts.index(
      guestAuthConnection,
      {
        communityName: communityName,
        body: {
          title: "Test",
          type: "text" as const,
          communityName: communityName,
          page: 1,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(searchResults);
  // 5. Test sorting by new
  const newPosts =
    await api.functional.redditLike.guest.communities.posts.index(
      guestAuthConnection,
      {
        communityName: communityName,
        body: {
          title: "Test",
          type: "text" as const,
          communityName: communityName,
          page: 1,
          limit: 10,
        } satisfies IRedditLikePost.IRequest,
      },
    );
  typia.assert(newPosts);
  // 6. Validate results
  TestValidator.equals("search results count", searchResults.data.length, 3);
  TestValidator.predicate(
    "has text post",
    searchResults.data.some((p) => p.title === "Test Text Post"),
  );
  TestValidator.predicate(
    "has link post",
    searchResults.data.some((p) => p.title === "Test Link Post"),
  );
  TestValidator.predicate(
    "has image post",
    searchResults.data.some((p) => p.title === "Test Image Post"),
  );
  TestValidator.predicate(
    "pagination metadata valid",
    searchResults.pagination.pages >= 1,
  );
}