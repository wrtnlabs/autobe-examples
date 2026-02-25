import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_comments_replies_create_reply } from "../../../generate/generate_random_community_member_comments_replies_create_reply";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

/**
 * Test creating a reply to a top-level comment, validating the nested threading system.
 *
 * Steps:
 * 1. Authenticate as a member and create a community
 * 2. Create a text post within the community
 * 3. Create a top-level comment on the post
 * 4. Create a reply to that comment with valid content
 * 5. Verify the reply is created successfully with correct properties
 */
export async function test_api_comment_reply_creation_to_top_level(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create a community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  // 3. Create a text post within the community
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
  // 4. Create a top-level comment on the post
  const topLevelComment =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(topLevelComment);
  // Verify top-level comment has no parent
  TestValidator.equals(
    "top-level comment parent is null",
    topLevelComment.parent,
    null,
  );
  // 5. Create a reply to the top-level comment
  const replyContent = "This is a thoughtful reply to your comment";
  const reply =
    await generate_random_community_member_comments_replies_create_reply(
      memberConnection,
      {
        params: { commentId: topLevelComment.id },
        body: {
          content: replyContent,
        },
      },
    );
  typia.assert(reply);
  // 6. Validate the reply is created successfully
  TestValidator.equals("reply content matches", reply.content, replyContent);
  // 7. Validate parent references the top-level comment
  TestValidator.predicate("reply has parent", reply.parent !== null);
  if (reply.parent !== null) {
    TestValidator.equals(
      "parent id matches top-level comment",
      reply.parent.id,
      topLevelComment.id,
    );
  }
  // 8. Validate post reference matches parent comment's post
  TestValidator.equals(
    "reply post matches parent comment post",
    reply.post.id,
    post.id,
  );
  // 9. Validate vote metrics initialized to 0
  TestValidator.equals("vote score is 0", reply.voteScore, 0);
  TestValidator.equals("upvote count is 0", reply.upvoteCount, 0);
  TestValidator.equals("downvote count is 0", reply.downvoteCount, 0);
  // 10. Validate isDeleted is false
  TestValidator.equals("is deleted is false", reply.isDeleted, false);
  // 11. Validate author matches authenticated member
  TestValidator.equals("author id matches member", reply.author.id, member.id);
  // 12. Validate timestamps are set
  TestValidator.predicate(
    "created_at is set",
    reply.createdAt !== null && reply.createdAt !== undefined,
  );
  TestValidator.predicate(
    "updated_at is set",
    reply.updatedAt !== null && reply.updatedAt !== undefined,
  );
}
