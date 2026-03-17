import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import type { IRedditLikePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePost";
import type { IRedditLikePostImageContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostImageContent";
import type { IRedditLikePostLinkContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostLinkContent";
import type { IRedditLikePostTextContent } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikePostTextContent";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test the edge case of retrieving a comment thread for a post that has no comments.
 * This validates that the endpoint handles empty discussions gracefully. The scenario should:
 * 1. Authenticate as member to create community and post
 * 2. Create a community and subscribe to it
 * 3. Create a post but do not add any comments
 * 4. Authenticate as moderator (with member credentials) to access thread
 * 5. Call the target endpoint with the post ID
 * 6. Verify the response returns successfully with an empty threads array
 * 7. Verify no errors occur when there are zero comments
 * 8. Verify the response structure is still valid (empty but well-formed array)
 *
 * This ensures moderators can view posts even when they have no discussion activity.
 */
export async function test_api_moderator_comment_thread_empty(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to create community and post
  const memberConnection: api.IConnection = { host: connection.host };
  const password = RandomGenerator.alphaNumeric(16);
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      password,
    } satisfies IRedditLikeMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create a community and subscribe to it
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.name(1),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      } satisfies IRedditLikeCommunity.ICreate,
    },
  );
  typia.assert(community);
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // Step 3: Create a post but do not add any comments
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.name(),
        community_id: community.id,
        post_type: "text",
        body: RandomGenerator.paragraph({ sentences: 3 }),
      } satisfies IRedditLikePost.ICreate,
    },
  );
  typia.assert(post);
  // Step 4: Authenticate as moderator (with member credentials) to access thread
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_login(moderatorConnection, {
    body: {
      email: member.email,
      password,
    } satisfies IRedditLikeModerator.ILogin,
  });
  // Step 5: Call the target endpoint with the post ID
  // The endpoint returns an empty array when there are no comments
  const threads =
    await api.functional.redditLike.moderator.posts.comments.thread(
      moderatorConnection,
      {
        postId: post.id,
      },
    );
  // Step 6 & 8: Verify the response structure is valid
  // The response type is verified via typia.assert at compile-time
  typia.assert(threads);
  // Step 6: Verify the response returns successfully with an empty threads array
  // Step 7: Verify no errors occur when there are zero comments
  TestValidator.predicate("threads is array and empty", () => {
    return Array.isArray(threads) && threads.length === 0;
  });
  // Additional verification that the response is well-formed
  TestValidator.predicate("response is valid structure", () => {
    return threads !== null && typeof threads === "object";
  });
}
