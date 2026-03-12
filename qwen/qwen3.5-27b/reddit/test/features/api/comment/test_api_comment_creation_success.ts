import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneComment";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditClonePost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePost";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_comments_create } from "../../../generate/generate_random_reddit_clone_member_posts_comments_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_comment } from "../../../prepare/prepare_random_reddit_clone_comment";
import { prepare_random_reddit_clone_community } from "../../../prepare/prepare_random_reddit_clone_community";
import { prepare_random_reddit_clone_post } from "../../../prepare/prepare_random_reddit_clone_post";

/**
 * Test the primary success path for comment creation.
 * 1. Authenticate as member
 * 2. Create a community
 * 3. Create a post in the community
 * 4. Create a top-level comment on the post
 * 5. Validate comment properties and associations
 */
export async function test_api_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community =
    await generate_random_reddit_clone_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Create a post in the community
  const post = await generate_random_reddit_clone_member_posts_create(
    memberConnection,
    {
      body: {
        communityId: community.id,
        postType: "text",
        title: RandomGenerator.paragraph({ sentences: 3 }),
        content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 4. Create a top-level comment on the post
  const commentContent = RandomGenerator.paragraph({ sentences: 2 });
  const comment =
    await generate_random_reddit_clone_member_posts_comments_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          content: commentContent,
          parent_id: null,
        },
      },
    );
  typia.assert(comment);
  // 5. Validate comment properties
  TestValidator.equals(
    "comment content matches input",
    comment.content,
    commentContent,
  );
  TestValidator.equals(
    "comment author matches authenticated member",
    comment.author.id,
    member.id,
  );
  TestValidator.equals(
    "comment associated with correct post",
    comment.post.id,
    post.id,
  );
  TestValidator.equals("comment score initialized to 0", comment.score, 0);
  TestValidator.equals(
    "top-level comment has null parent",
    comment.parent,
    null,
  );
  TestValidator.equals("comment is not deleted", comment.deleted_at, null);
  TestValidator.predicate(
    "created_at timestamp is valid",
    comment.created_at != null && comment.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at timestamp is valid",
    comment.updated_at != null && comment.updated_at.length > 0,
  );
}