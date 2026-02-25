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
import { generate_random_community_member_comments_replies_create_reply } from "../../../generate/generate_random_community_member_comments_replies_create_reply";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_posts_create } from "../../../generate/generate_random_community_member_communities_posts_create";
import { generate_random_community_member_posts_comments_create } from "../../../generate/generate_random_community_member_posts_comments_create";
import { prepare_random_community_comment } from "../../../prepare/prepare_random_community_comment";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_post } from "../../../prepare/prepare_random_community_post";

export async function test_api_comment_deletion_thread_preserved(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member Setup - Create authenticated member connection
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Community Setup - Create community
  const community = await generate_random_community_member_communities_create(
    memberConnection,
    {
      body: {
        name: `test_${RandomGenerator.alphaNumeric(8)}`,
        description: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(community);
  // 3. Subscribe to community (required for posting)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      memberConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 4. Create a text post
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
  // 5. Create parent comment
  const parentComment =
    await generate_random_community_member_posts_comments_create(
      memberConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(parentComment);
  // Store original data for verification
  const parentCommentId = parentComment.id;
  const parentCommentPostId = parentComment.post.id;
  // 6. Create reply to parent comment
  const replyComment =
    await generate_random_community_member_comments_replies_create_reply(
      memberConnection,
      {
        params: { commentId: parentComment.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(replyComment);
  // Store original reply data for verification
  const originalReplyContent = replyComment.content;
  const originalReplyAuthorId = replyComment.author.id;
  // Verify reply references parent correctly before deletion
  TestValidator.equals(
    "reply parent id matches before deletion",
    replyComment.parent?.id,
    parentCommentId,
  );
  // 7. Delete the parent comment - verifies deletion succeeds (void response)
  await api.functional.community.member.comments.erase(memberConnection, {
    commentId: parentCommentId,
  });
  // 8. Verify thread structure is preserved by creating another reply to the deleted parent
  // This proves the parent comment still exists in the thread hierarchy (soft-delete)
  const newReplyAfterDeletion =
    await generate_random_community_member_comments_replies_create_reply(
      memberConnection,
      {
        params: { commentId: parentCommentId },
        body: {
          content: RandomGenerator.paragraph({ sentences: 1 }),
        },
      },
    );
  typia.assert(newReplyAfterDeletion);
  // 9. Verify thread preservation after deletion
  // The new reply should still reference the (now soft-deleted) parent comment
  TestValidator.equals(
    "new reply parent id matches deleted parent",
    newReplyAfterDeletion.parent?.id,
    parentCommentId,
  );
  // Verify the new reply is on the same post
  TestValidator.equals(
    "new reply post matches original post",
    newReplyAfterDeletion.post.id,
    parentCommentPostId,
  );
  // Verify the reply's author is the authenticated member
  TestValidator.equals(
    "new reply author is member",
    newReplyAfterDeletion.author.id,
    member.id,
  );
  // Verify the new reply has valid content
  TestValidator.predicate(
    "new reply has content",
    newReplyAfterDeletion.content.length > 0,
  );
}
