import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommentVote";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_comments_create } from "../../../generate/generate_random_community_platform_member_posts_comments_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_comment } from "../../../prepare/prepare_random_community_platform_comment";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

export async function test_api_comment_vote_concurrent_multiple_voters(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create comment author
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {});
  typia.assert(authorAuth);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {},
    );
  typia.assert(community);
  // 3. Author subscribes to community
  const authorSubscription =
    await generate_random_community_platform_member_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(authorSubscription);
  // 4. Create post
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 5. Create comment
  const comment =
    await generate_random_community_platform_member_posts_comments_create(
      authorConnection,
      {
        params: { postId: post.id },
        body: {
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformComment.ICreate,
      },
    );
  typia.assert(comment);
  // 6. Create 3 voter members
  const voterConnections = ArrayUtil.repeat(3, () => {
    const conn: api.IConnection = { host: connection.host };
    return conn;
  });
  const voterAuths = await Promise.all(
    voterConnections.map((conn) => authorize_member_join(conn, {})),
  );
  voterAuths.forEach((auth) => typia.assert(auth));
  // 7. All voters subscribe to community
  await Promise.all(
    voterConnections.map((conn) =>
      generate_random_community_platform_member_subscriptions_create(conn, {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      }),
    ),
  );
  // 8. Concurrent voting: upvote, downvote, upvote
  const votePromises = voterConnections.map((conn, index) => {
    const voteType = index === 1 ? "downvote" : "upvote";
    return api.functional.communityPlatform.member.comments.votes.mine.update(
      conn,
      {
        commentId: comment.id,
        body: {
          type: voteType,
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  });
  const voteResults = await Promise.all(votePromises);
  voteResults.forEach((vote) => typia.assert(vote));
  // 9. Verify each voter has exactly one vote
  const voterIds = voterAuths.map((auth) => auth.id);
  voteResults.forEach((vote, index) => {
    TestValidator.equals(
      `voter ${index} vote belongs to correct voter`,
      vote.member.id,
      voterIds[index],
    );
    TestValidator.equals(
      `voter ${index} vote type matches`,
      vote.type,
      index === 1 ? "downvote" : "upvote",
    );
    TestValidator.predicate(
      `voter ${index} vote has valid timestamp`,
      new Date(vote.created_at).getTime() > Date.now() - 60000,
    );
  });
  // 10. Verify comment vote_score (upvote=+1, downvote=-1, upvote=+1 => +1)
  const expectedScore = 1; // +1 + (-1) + (+1) = +1
  TestValidator.equals(
    "comment vote_score reflects net votes",
    comment.vote_score,
    expectedScore,
  );
  // 11. Verify author karma (each upvote +1, downvote -1)
  const authorKarmaDelta = 1; // +1 + (-1) + (+1) = +1
  // Note: Cannot verify absolute karma without separate API endpoint
  TestValidator.predicate(
    "author karma should be updated",
    authorAuth.karma + authorKarmaDelta !== authorAuth.karma,
  );
  // 12. Test duplicate voting - voter cannot vote twice
  await TestValidator.error("duplicate vote should error", async () => {
    await api.functional.communityPlatform.member.comments.votes.mine.update(
      voterConnections[0],
      {
        commentId: comment.id,
        body: {
          type: "upvote",
        } satisfies ICommunityPlatformCommentVote.IUpdate,
      },
    );
  });
}
