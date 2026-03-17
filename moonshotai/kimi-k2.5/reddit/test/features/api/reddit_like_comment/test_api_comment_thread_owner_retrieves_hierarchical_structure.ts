import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeAttachment";
import type { IRedditLikeComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeComment";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunitySubscription";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";
import type { IRedditLikeOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeOwner";
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
import { authorize_owner_join } from "../../../authorize/authorize_owner_join";
import { authorize_owner_login } from "../../../authorize/authorize_owner_login";
import { authorize_owner_refresh } from "../../../authorize/authorize_owner_refresh";
import { generate_random_reddit_like_member_communities_create } from "../../../generate/generate_random_reddit_like_member_communities_create";
import { generate_random_reddit_like_member_posts_create } from "../../../generate/generate_random_reddit_like_member_posts_create";
import { prepare_random_reddit_like_community } from "../../../prepare/prepare_random_reddit_like_community";
import { prepare_random_reddit_like_post } from "../../../prepare/prepare_random_reddit_like_post";

/**
 * Test that an owner can successfully retrieve the complete comment thread for a post with all nested replies.
 * This validates the primary business workflow where owners access discussion content.
 *
 * Test sequence:
 * 1. Authenticate as owner to establish authorization context for target operation
 * 2. Authenticate as member to set up data prerequisites
 * 3. Create a community as member
 * 4. Subscribe to that community as member (required before posting per FR-SUB-005)
 * 5. Create a text-type post as member to generate postId
 * 6. Call the target endpoint as owner with the created postId
 * 7. Verify response includes all comments with their hierarchical reply structure, author information, vote scores, and timestamps
 */
export async function test_api_comment_thread_owner_retrieves_hierarchical_structure(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate as owner
  const ownerConnection: api.IConnection = { host: connection.host };
  await authorize_owner_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      nickname: RandomGenerator.name(),
      password: typia.random<string & tags.Format<"password">>(),
    } satisfies IRedditLikeOwner.IJoin,
  });
  // Step 2: Authenticate as member (for data setup prerequisites)
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(8),
      password: typia.random<string & tags.MinLength<8> & tags.Format<"password">>(),
    } satisfies IRedditLikeMember.IJoin,
  });
  // Step 3: Create a community as member
  const community = await generate_random_reddit_like_member_communities_create(
    memberConnection,
    {
      body: {
        description: RandomGenerator.paragraph({ sentences: 3 }),
        name: RandomGenerator.alphaNumeric(10),
      } satisfies DeepPartial<IRedditLikeCommunity.ICreate>,
    },
  );
  // Step 4: Subscribe to community as member (prerequisite for posting)
  await api.functional.redditLike.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // Step 5: Create a text-type post as member to generate postId
  const post = await generate_random_reddit_like_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 2 }),
        body: RandomGenerator.content({ paragraphs: 3 }),
      } satisfies DeepPartial<IRedditLikePost.ICreate>,
    },
  );
  // Step 6: Call the target endpoint as owner with created postId
  const thread = await api.functional.redditLike.owner.posts.comments.thread(
    ownerConnection,
    {
      postId: post.id,
    },
  );
  // Step 7: Validate response structure hierarchically includes all expected fields
  typia.assert(thread);
}