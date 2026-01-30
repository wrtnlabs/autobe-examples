import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBbsAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsAdmin";
import type { ICommunityBbsComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsComment";
import type { ICommunityBbsCommentReply } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentReply";
import type { ICommunityBbsCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommentVote";
import type { ICommunityBbsCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunity";
import type { ICommunityBbsCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunityModerator";
import type { ICommunityBbsCommunitySettings } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsCommunitySettings";
import type { ICommunityBbsMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsMember";
import type { ICommunityBbsModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsModerator";
import type { ICommunityBbsPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsPost";
import type { ICommunityBbsSection } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBbsSection";
import { prepare_random_community_bbs_community_moderator } from "../../../prepare/prepare_random_community_bbs_community_moderator";
import { prepare_random_community_bbs_community } from "../../../prepare/prepare_random_community_bbs_community";
import { prepare_random_community_bbs_post } from "../../../prepare/prepare_random_community_bbs_post";
import { prepare_random_community_bbs_comment_reply } from "../../../prepare/prepare_random_community_bbs_comment_reply";
import { prepare_random_community_bbs_comment } from "../../../prepare/prepare_random_community_bbs_comment";
import { generate_random_community_bbs_member_posts_create } from "../../../generate/generate_random_community_bbs_member_posts_create";
import { generate_random_community_bbs_member_comments_create } from "../../../generate/generate_random_community_bbs_member_comments_create";
import { generate_random_community_bbs_member_comments_replies_create } from "../../../generate/generate_random_community_bbs_member_comments_replies_create";
import { generate_random_community_bbs_admin_communities_moderators_create } from "../../../generate/generate_random_community_bbs_admin_communities_moderators_create";
import { generate_random_community_bbs_member_communities_create } from "../../../generate/generate_random_community_bbs_member_communities_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_comment_vote_retraction_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create connections for each actor - following Connection Isolation Pattern
  const adminConnection: api.IConnection = { host: connection.host };
  const memberConnection: api.IConnection = { host: connection.host };
  const moderatorConnection: api.IConnection = { host: connection.host };
  // Step 2: Admin creates moderator account
  const adminCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsAdmin.IJoin;
  const admin = await authorize_admin_join(adminConnection, {
    body: adminCreds,
  });
  // adminConnection.headers is now updated internally by authorize function
  const moderatorCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password_hash: RandomGenerator.alphaNumeric(32),
  } satisfies ICommunityBbsModerator.IJoin;
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: moderatorCreds,
  });
  // moderatorConnection.headers is now updated internally by authorize function
  // Step 3: Admin assigns moderator to community
  const community =
    await generate_random_community_bbs_member_communities_create(
      adminConnection,
      {},
    );
  await generate_random_community_bbs_admin_communities_moderators_create(
    adminConnection,
    {
      body: {
        monitor_id: moderator.id,
      },
      params: {
        communityCode: community.name,
      },
    },
  );
  // Step 4: Member creates account and authenticates
  const memberCreds = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies ICommunityBbsMember.IJoin;
  const member = await authorize_member_join(memberConnection, {
    body: memberCreds,
  });
  // memberConnection.headers is now updated internally by authorize function
  // Step 5: Member creates post
  const post = await generate_random_community_bbs_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title: RandomGenerator.paragraph({
          sentences: 5,
          wordMin: 3,
          wordMax: 10,
        }),
      },
    },
  );
  // Step 6: Member creates comment on post
  const comment = await generate_random_community_bbs_member_comments_create(
    memberConnection,
    {
      body: {
        post_id: post.id,
        content: RandomGenerator.content({
          paragraphs: 1,
          sentenceMin: 10,
          sentenceMax: 15,
          wordMin: 4,
          wordMax: 8,
        }),
      },
    },
  );
  // Step 7: Member creates reply to comment
  const reply =
    await generate_random_community_bbs_member_comments_replies_create(
      memberConnection,
      {
        params: {
          commentId: comment.id,
        },
        body: {
          reply_content: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 8,
            sentenceMax: 12,
            wordMin: 4,
            wordMax: 8,
          }),
        },
      },
    );
  // Step 8: Member creates vote on reply (upvote)
  // The voteId should be the id of the comment reply since we're voting on a comment reply
  const createVoteResponse =
    await api.functional.communityBbs.member.comment_votes.update(
      memberConnection,
      {
        voteId: reply.id,
        body: {
          vote_value: 1,
        },
      },
    );
  typia.assert(createVoteResponse);
  const voteId = createVoteResponse.id;
  // Step 9: Moderator retracts vote
  await api.functional.communityBbs.member.comment_votes.erase(
    moderatorConnection,
    {
      voteId: voteId,
    },
  );
  // Step 10: Verify vote retraction
  await TestValidator.error(
    "Deleting already deleted vote should fail with 404",
    async () => {
      await api.functional.communityBbs.member.comment_votes.erase(
        moderatorConnection,
        {
          voteId: voteId,
        },
      );
    },
  );
}
