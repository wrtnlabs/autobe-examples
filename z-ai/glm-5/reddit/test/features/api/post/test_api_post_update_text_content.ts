import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test updating a TEXT post with new title and modified text content.
 *
 * Workflow:
 * 1. Member authenticates via join
 * 2. Member creates a community (becomes owner)
 * 3. Member subscribes to the community (required for posting)
 * 4. Member creates a TEXT post
 * 5. Member updates the post with new title and text_content
 * 6. Validate: title updated, text_content updated, edited_at set, created_at unchanged,
 *    vote counts preserved, comment counts preserved, author/community relations intact
 */
export async function test_api_post_update_text_content(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {});
  // 2. Create a community (member becomes owner)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (required for posting)
  await api.functional.community.member.communities.subscribe(
    memberConnection,
    {
      communityName: community.name,
    },
  );
  // 4. Create a TEXT post
  const originalTitle = RandomGenerator.paragraph({ sentences: 2 });
  const originalContent = RandomGenerator.content({ paragraphs: 3 });
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: {
        title: originalTitle,
        post_type: "TEXT",
        text_content: originalContent,
      } satisfies ICommunityPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Update the post with new title and text_content
  const newTitle = RandomGenerator.paragraph({ sentences: 2 });
  const newContent = RandomGenerator.content({ paragraphs: 4 });
  const updatedPost = await api.functional.community.member.posts.update(
    memberConnection,
    {
      postId: post.id,
      body: {
        title: newTitle,
        text_content: newContent,
      } satisfies ICommunityPost.IUpdate,
    },
  );
  typia.assert(updatedPost);
  // 6. Validate the update
  TestValidator.equals("title updated", updatedPost.title, newTitle);
  TestValidator.equals(
    "text content updated",
    updatedPost.textContent,
    newContent,
  );
  TestValidator.predicate("edited_at is set", updatedPost.editedAt !== null);
  TestValidator.equals(
    "created_at unchanged",
    updatedPost.createdAt,
    post.createdAt,
  );
  TestValidator.equals(
    "vote score preserved",
    updatedPost.voteScore,
    post.voteScore,
  );
  TestValidator.equals(
    "upvote count preserved",
    updatedPost.upvoteCount,
    post.upvoteCount,
  );
  TestValidator.equals(
    "downvote count preserved",
    updatedPost.downvoteCount,
    post.downvoteCount,
  );
  TestValidator.equals(
    "comment count preserved",
    updatedPost.commentCount,
    post.commentCount,
  );
  TestValidator.equals(
    "author preserved",
    updatedPost.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "community preserved",
    updatedPost.community.id,
    post.community.id,
  );
}
