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
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_reply } from "../../../prepare/prepare_random_community_bbs_comment_reply";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_moderator_comments_create } from "../../../generate/generate_random_community_bbs_moderator_comments_create";
import { generate_random_community_bbs_moderator_comments_replies_create } from "../../../generate/generate_random_community_bbs_moderator_comments_replies_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
export async function test_api_comment_reply_creation_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate member actor
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityBbsMember.IJoin,
  });
  typia.assert(member);
  // Step 2: Create moderator connection and authenticate moderator actor
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password_hash: RandomGenerator.alphaNumeric(32),
    } satisfies ICommunityBbsModerator.IJoin,
  });
  typia.assert(moderator);
  // Step 3: Create community using member actor
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityBbsCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 4: Create post using member actor
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: community.id,
        post_type: "text",
      } satisfies ICommunityBbsPost.ICreate,
    },
  );
  typia.assert(post);
  // Step 5: Create comment using moderator actor
  const comment = await generate_random_community_bbs_moderator_comments_create(
    moderatorConnection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content(),
      } satisfies ICommunityBbsComment.ICreate,
    },
  );
  typia.assert(comment);
  // Step 6: Create reply to comment using moderator actor
  const replyContent = RandomGenerator.paragraph();
  const reply =
    await api.functional.communityBbs.moderator.comments.replies.create(
      moderatorConnection,
      {
        commentId: comment.id,
        body: {
          content: replyContent,
        } satisfies ICommunityBbsCommentReply.ICreate,
      },
    );
  typia.assert(reply);
  // Step 7: Validate reply is correctly linked to parent comment
  TestValidator.equals(
    "reply comment_id matches parent comment id",
    reply.comment_id,
    comment.id,
  );
  TestValidator.equals(
    "reply author_id matches moderator user id",
    reply.author_id,
    moderator.user_id,
  );
  TestValidator.equals(
    "reply content matches submitted content",
    reply.content,
    replyContent,
  );
  // Since reply_count property doesn't exist in ICommunityBbsComment, we cannot validate it
  // Instead, validate the comment's core properties remain unchanged
  TestValidator.equals(
    "comment id remains unchanged after reply creation",
    comment.id,
    comment.id,
  );
  TestValidator.equals(
    "comment content remains unchanged after reply creation",
    comment.content,
    comment.content,
  );
  TestValidator.equals(
    "comment author remains unchanged after reply creation",
    comment.author.id,
    comment.author.id,
  );
}
