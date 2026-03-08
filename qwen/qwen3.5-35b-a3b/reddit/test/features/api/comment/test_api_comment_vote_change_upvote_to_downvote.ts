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

export async function test_api_comment_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate Member A (will upvote -> downvote)
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberA);
  // 2. Authenticate Member B (will create comment and receive votes)
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(memberB);
  // 3. Member B creates a community
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberBConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 4. Member B subscribes to their own community (to enable posting)
  await generate_random_reddit_platform_member_communities_subscribe(
    memberBConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 5. Member B creates a post in the community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberBConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 2 }),
        postType: "TEXT",
        redditPlatformCommunityId: community.id,
        content: RandomGenerator.paragraph({ sentences: 3 }),
      },
    },
  );
  typia.assert(post);
  // 6. Member A subscribes to the community
  await generate_random_reddit_platform_member_communities_subscribe(
    memberAConnection,
    {
      params: { communityId: community.id },
    },
  );
  // 7. Member B creates a comment on the post
  const comment = await generate_random_reddit_platform_member_comments_create(
    memberBConnection,
    {
      body: {
        content: RandomGenerator.paragraph({ sentences: 2 }),
        post_id: post.id,
      },
    },
  );
  typia.assert(comment);
  // 8. Member A casts an upvote on the comment
  const upvoteResponse =
    await api.functional.redditPlatform.member.comments.votes.vote(
      memberAConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "upvote",
        },
      },
    );
  typia.assert(upvoteResponse);
  // 9. Verify the upvote record shows UPVOTE
  TestValidator.equals(
    "upvote vote_type is UPVOTE",
    upvoteResponse.voteType,
    "UPVOTE",
  );
  // 10. Member A changes their vote to downvote
  const downvoteResponse =
    await api.functional.redditPlatform.member.comments.votes.vote(
      memberAConnection,
      {
        commentId: comment.id,
        body: {
          vote_type: "downvote",
        },
      },
    );
  typia.assert(downvoteResponse);
  // 11. Verify the vote record shows DOWNVOTE
  TestValidator.equals(
    "downvote vote_type is DOWNVOTE",
    downvoteResponse.voteType,
    "DOWNVOTE",
  );
  // 12. Verify the vote_score is decremented by 2 (from +1 to -1)
  TestValidator.equals(
    "vote_score changed from +1 to -1",
    downvoteResponse.comment.vote_score,
    -1,
  );
  // 13. Verify the updated_at timestamp reflects the change
  TestValidator.predicate(
    "vote updated_at is after upvote",
    new Date(downvoteResponse.updatedAt) > new Date(upvoteResponse.updatedAt),
  );
}