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
 * Test successful retrieval of a TEXT type post with complete details.
 *
 * Setup flow:
 * 1. Create a member account via join
 * 2. Create a community (creator is auto-subscribed)
 * 3. Create a TEXT post with title and markdown content
 * 4. Retrieve the post via GET endpoint
 * 5. Validate all response fields are correctly populated
 */
export async function test_api_post_text_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community (creator is automatically subscribed)
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a TEXT post with title and markdown content
  const postTitle = RandomGenerator.paragraph({ sentences: 2 });
  const postContent = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 5,
    sentenceMax: 10,
  });
  const createdPost =
    await generate_random_community_member_communities_posts_create(
      memberConnection,
      {
        params: { communityName: community.name },
        body: {
          title: postTitle,
          post_type: "TEXT",
          text_content: postContent,
        } satisfies ICommunityPost.ICreate,
      },
    );
  typia.assert(createdPost);
  // 4. Retrieve the post using the public endpoint
  const retrievedPost = await api.functional.community.posts.at(connection, {
    postId: createdPost.id,
  });
  typia.assert(retrievedPost);
  // 5. Validate all fields are correctly populated
  TestValidator.equals("post id matches", retrievedPost.id, createdPost.id);
  TestValidator.equals("title matches", retrievedPost.title, postTitle);
  TestValidator.equals("post type is TEXT", retrievedPost.postType, "TEXT");
  TestValidator.equals(
    "text content matches",
    retrievedPost.textContent,
    postContent,
  );
  TestValidator.equals(
    "vote score is 1 (author auto-upvote)",
    retrievedPost.voteScore,
    1,
  );
  TestValidator.equals("upvote count is 1", retrievedPost.upvoteCount, 1);
  TestValidator.equals("downvote count is 0", retrievedPost.downvoteCount, 0);
  TestValidator.equals("comment count is 0", retrievedPost.commentCount, 0);
  TestValidator.equals("author id matches", retrievedPost.author.id, member.id);
  TestValidator.equals(
    "community id matches",
    retrievedPost.community.id,
    community.id,
  );
  TestValidator.predicate(
    "created_at is valid date",
    new Date(retrievedPost.createdAt).getTime() > 0,
  );
  TestValidator.equals(
    "edited_at is null for new post",
    retrievedPost.editedAt,
    null,
  );
}
