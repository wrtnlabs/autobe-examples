import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
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
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_comment_creation_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and authenticate as a new member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Subscribe to the community (required before posting)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a TEXT post in the community
  const post = await generate_random_community_member_communities_posts_create(
    memberConnection,
    {
      params: { communityName: community.name },
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "TEXT",
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // Store initial comment count
  const initialCommentCount = post.commentCount;
  // 5. Create a comment on the post with valid content
  const commentContent = `  ${RandomGenerator.paragraph({ sentences: 3 })}  `;
  const comment = await api.functional.community.member.posts.comments.create(
    memberConnection,
    {
      postId: post.id,
      body: { content: commentContent } satisfies ICommunityComment.ICreate,
    },
  );
  typia.assert(comment);
  // Verify comment properties
  TestValidator.equals("id is UUID format", comment.id, comment.id);
  TestValidator.equals(
    "content matches input (whitespace stripped)",
    comment.content,
    commentContent.trim(),
  );
  TestValidator.equals("vote score is 0", comment.voteScore, 0);
  TestValidator.equals("upvote count is 0", comment.upvoteCount, 0);
  TestValidator.equals("downvote count is 0", comment.downvoteCount, 0);
  TestValidator.predicate("is not deleted", comment.isDeleted === false);
  TestValidator.equals("parent is null (top-level)", comment.parent, null);
  TestValidator.equals("editedAt is null", comment.editedAt, null);
  TestValidator.equals("deletedAt is null", comment.deletedAt, null);
  TestValidator.equals("author matches member", comment.author.id, member.id);
  TestValidator.equals("post matches target", comment.post.id, post.id);
  TestValidator.predicate(
    "createdAt is set",
    comment.createdAt !== null && comment.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updatedAt is set",
    comment.updatedAt !== null && comment.updatedAt !== undefined,
  );
  // Verify post's comment count was incremented
  TestValidator.equals(
    "post comment_count incremented by 1",
    comment.post.comment_count,
    initialCommentCount + 1,
  );
}
