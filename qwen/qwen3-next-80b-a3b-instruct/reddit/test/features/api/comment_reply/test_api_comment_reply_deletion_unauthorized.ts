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
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_reply } from "../../../prepare/prepare_random_community_bbs_comment_reply";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_member_comments_replies_create } from "../../../generate/generate_random_community_bbs_member_comments_replies_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_comment_reply_deletion_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connection and authenticate first member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member1);
  // Step 2: Create community for the post
  const community =
    await generate_random_community_bbs_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Create a post within the community
  const post = await generate_random_community_bbs_member_posts_create(
    member1Connection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_id: community.id,
        post_type: "text",
      },
    },
  );
  typia.assert(post);
  // Step 4: Create a comment on the post
  const comment = await generate_random_community_bbs_member_comments_create(
    member1Connection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({ paragraphs: 1 }),
      },
    },
  );
  typia.assert(comment);
  // Step 5: Create a reply to the comment (owned by first member)
  const reply =
    await generate_random_community_bbs_member_comments_replies_create(
      member1Connection,
      {
        params: {
          commentId: comment.id,
        },
        body: {},
      },
    );
  typia.assert(reply);
  // Step 6: Create connection and authenticate second member
  const member2Connection: api.IConnection = { host: connection.host };
  await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  // Step 7: Attempt to delete reply as unauthorized user
  await TestValidator.error(
    "unauthorized member cannot delete another member's reply",
    async () => {
      await api.functional.communityBbs.member.comments.replies.erase(
        member2Connection,
        {
          commentId: comment.id,
          replyId: reply.id,
        },
      );
    },
  );
}
