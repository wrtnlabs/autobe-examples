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
export async function test_api_comment_deletion_by_author_with_replies_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    },
  });
  typia.assert(member);
  // Step 2: Create community for the post
  const community =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph(),
        },
      },
    );
  typia.assert(community);
  // Step 3: Create post in the community
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 2,
          wordMin: 3,
          wordMax: 8,
        }),
        community_id: community.id,
        post_type: "text",
      },
    },
  );
  typia.assert(post);
  // Step 4: Create comment on the post
  const comment = await generate_random_community_bbs_member_comments_create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 5,
          sentenceMax: 10,
        }),
      },
    },
  );
  typia.assert(comment);
  // Step 5: Create reply to the comment (making it non-deletable by author)
  const reply =
    await generate_random_community_bbs_member_comments_replies_create(
      memberConnection,
      {
        body: {
          content: RandomGenerator.paragraph({
            sentences: 1,
            wordMin: 5,
            wordMax: 10,
          }),
        },
        params: {
          commentId: comment.id,
        },
      },
    );
  typia.assert(reply);
  // Step 6: Try to delete comment as author - should be rejected with 403 Forbidden
  await TestValidator.error(
    "comment deletion with replies by author should be rejected",
    async () => {
      await api.functional.communityBbs.member.comments.erase(
        memberConnection,
        {
          commentId: comment.id,
        },
      );
    },
  );
}
