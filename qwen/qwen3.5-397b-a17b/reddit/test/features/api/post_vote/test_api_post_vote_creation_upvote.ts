import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityIcon";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostImage";
import type { IRedditCommunityPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostVote";
import type { IRedditCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunitySubscription";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_community_member_communities_create } from "../../../generate/generate_random_reddit_community_member_communities_create";
import { generate_random_reddit_community_member_posts_vote_create } from "../../../generate/generate_random_reddit_community_member_posts_vote_create";
import { prepare_random_reddit_community_community } from "../../../prepare/prepare_random_reddit_community_community";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";

export async function test_api_post_vote_creation_upvote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication - join as new member
  const memberConnection: api.IConnection = { host: connection.host };
  const username = RandomGenerator.name(1);
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: username,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies IRedditCommunityMember.IJoin,
  });
  typia.assert(memberAuth);
  // 2. Create community as container for the post
  const community =
    await generate_random_reddit_community_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community);
  // 3. Subscribe member to community before creating post
  const subscription =
    await api.functional.redditCommunity.member.communities.subscription.create(
      memberConnection,
      {
        communityName: community.name,
      },
    );
  typia.assert(subscription);
  // 4. Create text post that will receive the vote
  const post = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        post_type: "text",
        title: RandomGenerator.paragraph({ sentences: 1 }),
        text_content: RandomGenerator.content({ paragraphs: 2 }),
      },
    },
  );
  typia.assert(post);
  // 5. Cast initial upvote on the post
  const vote = await generate_random_reddit_community_member_posts_vote_create(
    memberConnection,
    {
      body: {
        direction: "UPVOTE",
      },
      params: {
        postId: post.id,
      },
    },
  );
  typia.assert(vote);
  // 6. Validate vote entity structure and values
  TestValidator.equals("vote direction is UPVOTE", vote.direction, "UPVOTE");
  TestValidator.equals(
    "vote member matches authenticated user",
    vote.member.id,
    memberAuth.id,
  );
  TestValidator.equals("vote post matches created post", vote.post.id, post.id);
  TestValidator.predicate(
    "vote has valid created_at timestamp",
    vote.created_at !== null,
  );
  TestValidator.predicate(
    "vote has valid updated_at timestamp",
    vote.updated_at !== null,
  );
  TestValidator.equals("vote is not soft-deleted", vote.deleted_at, null);
  // 7. Validate member summary in vote response
  TestValidator.equals(
    "vote member username matches",
    vote.member.username,
    username,
  );
  TestValidator.predicate(
    "vote member has created_at",
    vote.member.created_at !== null,
  );
  // 8. Validate post summary in vote response
  TestValidator.equals("vote post title matches", vote.post.title, post.title);
  TestValidator.equals(
    "vote post author matches",
    vote.post.author.id,
    memberAuth.id,
  );
  TestValidator.equals(
    "vote post community matches",
    vote.post.community.id,
    community.id,
  );
}
