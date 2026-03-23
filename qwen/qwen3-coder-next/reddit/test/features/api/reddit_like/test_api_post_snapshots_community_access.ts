import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikeCommunity";
import type { IPageIRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditLikePostSnapshot";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

export async function test_api_post_snapshots_community_access(
  connection: api.IConnection,
): Promise<void> {
  // Create member-specific connections
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberBConnection: api.IConnection = { host: connection.host };
  // Step 1: Member A subscribes to a community
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Get available communities to subscribe to
  const availableCommunities =
    await api.functional.redditLike.member.communities.my.index(
      memberAConnection,
    );
  typia.assert(availableCommunities);
  // Find a community to subscribe to (or use the first one if available)
  const community = availableCommunities.data[0];
  if (!community) {
    throw new Error("No communities available to subscribe");
  }
  // Subscribe member A to the community
  await api.functional.redditLike.member.communities.my.index(
    memberAConnection,
  );
  // Step 2: Member B creates a post in the subscribed community
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(),
    } satisfies IRedditLikeMember.IJoin,
  });
  const post = await api.functional.redditLike.member.posts.create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        type: "text" as const,
        content: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Step 3: Member A retrieves snapshots for the post with various pagination parameters
  const snapshot1 =
    await api.functional.redditLike.member.posts.snapshots.index(
      memberAConnection,
      {
        postId: post.id,
        body: {
          limit: 10,
          offset: 0,
          sort: "new" as const,
        } satisfies IRedditLikePostSnapshot.IRequest,
      },
    );
  typia.assert(snapshot1);
  // Step 4: Validate response structure
  TestValidator.equals("pagination exists", snapshot1.pagination.current, 1);
  TestValidator.predicate(
    "has valid records count",
    snapshot1.pagination.records >= 0,
  );
  TestValidator.equals("data is array", Array.isArray(snapshot1.data), true);
  // Test with different pagination parameters
  const snapshot2 =
    await api.functional.redditLike.member.posts.snapshots.index(
      memberAConnection,
      {
        postId: post.id,
        body: {
          limit: 5,
          offset: 0,
          sort: "hot" as const,
          timeFilter: "all" as const,
        } satisfies IRedditLikePostSnapshot.IRequest,
      },
    );
  typia.assert(snapshot2);
  // Test with different sorting
  const snapshot3 =
    await api.functional.redditLike.member.posts.snapshots.index(
      memberAConnection,
      {
        postId: post.id,
        body: {
          sort: "top" as const,
          timeFilter: "week" as const,
        } satisfies IRedditLikePostSnapshot.IRequest,
      },
    );
  typia.assert(snapshot3);
}
