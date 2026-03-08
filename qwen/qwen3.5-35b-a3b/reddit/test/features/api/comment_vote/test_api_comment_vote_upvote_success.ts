import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_comments_create } from "../../../generate/generate_random_reddit_platform_member_comments_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_subscribe } from "../../../generate/generate_random_reddit_platform_member_communities_subscribe";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_comment } from "../../../prepare/prepare_random_reddit_platform_comment";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_subscription } from "../../../prepare/prepare_random_reddit_platform_community_subscription";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_comment_vote_upvote_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create vote-casting member
  const voteCasterConnection: api.IConnection = { host: connection.host };
  const voteCaster = await authorize_member_join(voteCasterConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(voteCaster);
  // 2. Create comment-author member
  const commentAuthorConnection: api.IConnection = { host: connection.host };
  const commentAuthor = await authorize_member_join(commentAuthorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(10),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(commentAuthor);
  // 3. Vote caster creates community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      voteCasterConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Vote caster subscribes to their own community
  await generate_random_reddit_platform_member_communities_subscribe(
    voteCasterConnection,
    {
      body: { confirmSubscription: true },
      params: { communityId: community.id },
    },
  );
  // 5. Comment author creates post in subscribed community
  const post = await generate_random_reddit_platform_member_posts_create(
    commentAuthorConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 6. Comment author creates comment on post
  const comment = await generate_random_reddit_platform_member_comments_create(
    commentAuthorConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post.id,
      },
    },
  );
  typia.assert(comment);
  // 7. Verify initial comment vote_score is 0
  TestValidator.equals("initial vote score", comment.vote_score, 0);
  // 8. Vote caster casts upvote on the comment
  const vote = await api.functional.redditPlatform.member.comments.votes.vote(
    voteCasterConnection,
    {
      commentId: comment.id,
      body: {
        vote_type: "upvote",
      },
    },
  );
  typia.assert(vote);
  // 9. Verify response contains vote record with vote_type: UPVOTE
  TestValidator.equals("vote type", vote.voteType, "UPVOTE");
  // 10. Verify vote record has correct author_id and comment_id
  TestValidator.equals(
    "vote author matches voter",
    vote.author.id,
    voteCaster.id,
  );
  TestValidator.equals(
    "vote comment matches comment",
    vote.comment.id,
    comment.id,
  );
  // 11. Verify comment vote_score is incremented to 1 in response
  TestValidator.equals("updated vote score", vote.comment.vote_score, 1);
  // 12. Verify comment deleted_at is NULL
  TestValidator.equals("comment not deleted", vote.comment.deleted_at, null);
  // 13. Attempt second upvote by same voter (should fail - single vote rule)
  const secondVote =
    await api.functional.redditPlatform.member.comments.votes.vote(
      voteCasterConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        },
      },
    );
  typia.assert(secondVote);
  // 14. Verify second upvote doesn't change vote_type (still UPVOTE)
  TestValidator.equals(
    "second upvote doesn't change vote type",
    secondVote.voteType,
    "UPVOTE",
  );
  // 15. Verify vote_score remains at 1 (no double counting)
  TestValidator.equals(
    "vote score unchanged after second upvote",
    secondVote.comment.vote_score,
    1,
  );
}