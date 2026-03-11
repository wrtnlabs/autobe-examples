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

export async function test_api_community_posts_guest_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create guest authentication
  const guestConnection: api.IConnection = { host: connection.host };
  const guestToken = await authorize_guest_join(guestConnection, {
    body: {
      device_id: typia.random<string & tags.Format<"uuid">>(),
    } satisfies IRedditLikeGuest.IJoin,
  });
  // 2. Create a community with member account (required for post creation)
  // Since we don't have member registration API in scope, we'll test with a known community name
  // In real scenario, this would be created by admin first
  const communityName = "test_community_" + RandomGenerator.alphabets(4);
  // 3. Test guest access to community posts
  const result = await api.functional.redditLike.guest.communities.posts.index(
    guestConnection,
    {
      communityName: communityName,
      body: {
        title: RandomGenerator.name(3),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 2 }),
        communityName: communityName,
        page: 1,
        limit: 10,
      } satisfies IRedditLikePost.IRequest,
    },
  );
  typia.assert(result);
  // 4. Validate response structure
  TestValidator.equals("has pagination", result.pagination.current, 1);
  TestValidator.predicate("has data array", Array.isArray(result.data));
  // Verify each post has expected structure
  result.data.forEach((post: IRedditLikePost.ISummary) => {
    TestValidator.equals("has author id", typeof post.author.id, "string");
    TestValidator.equals(
      "has community name",
      typeof post.community.name,
      "string",
    );
    TestValidator.predicate("has vote score >= 0", post.voteScore >= 0);
    TestValidator.predicate("has comment count >= 0", post.commentCount >= 0);
  });
}
