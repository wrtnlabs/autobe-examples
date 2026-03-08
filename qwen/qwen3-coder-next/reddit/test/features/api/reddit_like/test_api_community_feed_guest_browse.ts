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

export async function test_api_community_feed_guest_browse(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection
  const guestConnection: api.IConnection = { host: connection.host };
  await authorize_guest_join(guestConnection, {
    body: typia.random<IRedditLikeGuest.IJoin>(),
  });
  // Use a community name for testing
  const communityName = "typescript";
  // Test guest community feed access with valid parameters
  const response =
    await api.functional.redditLike.guest.communities.feed.search(
      guestConnection,
      {
        communityName,
        body: {
          page: 1,
          limit: 10,
          sort: "hot",
        },
      },
    );
  // Validate response structure
  typia.assert(response);
  TestValidator.equals(
    "response has pagination",
    response.pagination.current,
    1,
  );
  TestValidator.equals(
    "response has correct limit",
    response.pagination.limit,
    10,
  );
  TestValidator.predicate("response has data", Array.isArray(response.data));
  TestValidator.predicate(
    "response data is array of post summaries",
    response.data.every(
      (post) =>
        typeof post.id === "string" &&
        typeof post.title === "string" &&
        typeof post.author === "object" &&
        typeof post.community === "object" &&
        typeof post.score === "number" &&
        typeof post.comment_count === "number" &&
        typeof post.created_at === "string",
    ),
  );
}
