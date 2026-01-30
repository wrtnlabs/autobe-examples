import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReply";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_reply } from "../../../prepare/prepare_random_community_bbs_comment_reply";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_member_comments_replies_create } from "../../../generate/generate_random_community_bbs_member_comments_replies_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_reply_creation(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member to establish user identity
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies ICommunityBbsMember.IJoin,
    },
  );
  typia.assert(member);
  // Step 2: Create a post to which the parent comment will be attached
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 3,
          wordMin: 5,
          wordMax: 10,
        }),
        community_id: typia.random<string & tags.Format<"uuid">>(),
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    });
  typia.assert(post);
  // Step 3: Create parent comment on the post
  const parentComment: ICommunityBbsComment =
    await generate_random_community_bbs_member_comments_create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.content({
            paragraphs: 2,
            sentenceMin: 10,
            sentenceMax: 15,
            wordMin: 4,
            wordMax: 8,
          }),
        } satisfies ICommunityBbsComment.ICreate,
      },
    );
  typia.assert(parentComment);
  // Step 4: Create the reply to the parent comment
  const replyContent = RandomGenerator.paragraph({
    sentences: 1,
    wordMin: 5,
    wordMax: 15,
  });
  const reply: ICommunityBbsCommentReply =
    await api.functional.communityBbs.member.comments.replies.create(
      memberConnection,
      {
        commentId: parentComment.id,
        body: {
          content: replyContent,
        } satisfies ICommunityBbsCommentReply.ICreate,
      },
    );
  typia.assert(reply);
  // Step 5: Validate the created reply object
  TestValidator.equals(
    "reply content matches submitted content",
    reply.content,
    replyContent,
  );
  TestValidator.equals(
    "reply author id matches member id",
    reply.author_id,
    member.id,
  );
  TestValidator.equals(
    "reply comment id matches parent comment id",
    reply.comment_id,
    parentComment.id,
  );
  TestValidator.equals(
    "reply has correct author object structure",
    reply.author.id,
    member.id,
  );
  TestValidator.equals(
    "reply has correct author name",
    reply.author.name,
    member.display_name,
  );
}
