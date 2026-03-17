import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_posts_create } from "../../../generate/generate_random_reddit_platform_member_posts_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_post } from "../../../prepare/prepare_random_reddit_platform_post";

export async function test_api_post_vote_change_upvote_to_downvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member A (post creator) setup
  const memberAConnection: api.IConnection = { host: connection.host };
  const memberA = await authorize_member_join(memberAConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberA);
  // 2. Member A creates community (auto-subscribed as owner)
  const community =
    await generate_random_reddit_platform_member_communities_create(
      memberAConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Member A creates post in their community
  const post = await generate_random_reddit_platform_member_posts_create(
    memberAConnection,
    {
      body: {
        community_id: community.id,
        title: RandomGenerator.paragraph({ sentences: 2 }),
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies IRedditPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const initialPostScore = post.vote_score;
  // 4. Member B (voter) setup
  const memberBConnection: api.IConnection = { host: connection.host };
  const memberB = await authorize_member_join(memberBConnection, {
    body: {
      email: typia.assert<string & tags.MinLength<1> & tags.MaxLength<255> & tags.Format<"email">>(
        typia.random<string & tags.Format<"email">>(),
      ),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberB);
  // 5. Member B subscribes to community for voting eligibility
  const subscription =
    await api.functional.redditPlatform.member.communities.subscriptions.create(
      memberBConnection,
      {
        communityId: community.id,
      },
    );
  typia.assert(subscription);
  // 6. Member B casts initial upvote on Member A's post
  const upvote = await api.functional.redditPlatform.member.posts.vote(
    memberBConnection,
    {
      postId: post.id,
      body: {
        type: "upvote",
      } satisfies IRedditPlatformPostVote.IRequest,
    },
  );
  typia.assert(upvote);
  // Verify upvote was created
  TestValidator.equals("upvote type", upvote.type, "upvote");
  // 7. Member B changes vote to downvote
  const downvote = await api.functional.redditPlatform.member.posts.vote(
    memberBConnection,
    {
      postId: post.id,
      body: {
        type: "downvote",
      } satisfies IRedditPlatformPostVote.IRequest,
    },
  );
  typia.assert(downvote);
  // 8. Verify the vote record is updated with type='downvote'
  TestValidator.equals("vote changed to downvote", downvote.type, "downvote");
  // 9. Verify the vote response includes the post with updated vote_score
  TestValidator.equals(
    "post vote_score in vote response",
    downvote.post.vote_score,
    initialPostScore - 2,
  );
  // 10. Verify the vote record contains correct post reference
  TestValidator.equals(
    "vote post ID matches original post",
    downvote.post.id,
    post.id,
  );
  // 11. Verify the vote record contains correct member reference
  TestValidator.equals(
    "vote member ID matches voter",
    downvote.member.id,
    memberB.id,
  );
}