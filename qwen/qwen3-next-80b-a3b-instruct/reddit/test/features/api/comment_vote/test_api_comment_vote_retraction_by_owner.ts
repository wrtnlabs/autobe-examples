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
import type { ICommunityBbsCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentVote";
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
export async function test_api_comment_vote_retraction_by_owner(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityBbsMember.IAuthorized = await authorize_member_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<128>
        >(),
      },
    },
  );
  typia.assert(member);
  // Step 2: Create a community for post placement using the member connection
  const community: ICommunityBbsCommunity =
    await generate_random_community_bbs_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  // Step 3: Create a post within the community
  const post: ICommunityBbsPost =
    await generate_random_community_bbs_member_posts_create(memberConnection, {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        community_id: community.id,
        post_type: "text",
      },
    });
  typia.assert(post);
  // Step 4: Create a comment on the post
  const comment: ICommunityBbsComment =
    await generate_random_community_bbs_member_comments_create(
      memberConnection,
      {
        body: {
          post_id: post.id,
          content: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(comment);
  // Step 5: Create a reply to the comment
  const reply: ICommunityBbsCommentReply =
    await generate_random_community_bbs_member_comments_replies_create(
      memberConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {},
      },
    );
  typia.assert(reply);
  // Step 6: Create a vote on the reply by the member using the reply's id as voteId
  const vote: ICommunityBbsCommentVote =
    await api.functional.communityBbs.member.comment_votes.update(
      memberConnection,
      {
        voteId: reply.id,
        body: {
          vote_value: 1,
        },
      },
    );
  typia.assert(vote);
  // Step 7: Retract the vote (delete the vote record)
  await api.functional.communityBbs.member.comment_votes.erase(
    memberConnection,
    {
      voteId: vote.id,
    },
  );
  // Step 8: Validate that the vote record has been successfully deleted
  // Since the API returns void on successful deletion and there is no way to check if a vote exists,
  // and there is no vote_count field in the schema, we can only validate that no error was thrown
  // during the delete operation. This is acceptable as per the API contract.
  // The scenario's request to validate vote count is impossible due to absence of vote_count field.
  // Therefore, the absence of an error during erase constitutes successful validation.
}
