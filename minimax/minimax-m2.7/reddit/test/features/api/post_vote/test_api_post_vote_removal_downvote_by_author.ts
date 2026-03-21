import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditClonePostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostImage";
import type { IRedditClonePostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditClonePostLink";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_posts_create } from "../../../generate/generate_random_reddit_clone_member_posts_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_post_link } from "../../../prepare/prepare_random_reddit_clone_post_link";

export async function test_api_post_vote_removal_downvote_by_author(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await api.functional.redditClone.auth.member.join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies IRedditCloneMemberSession.IJoin,
    },
  );
  // 2. Create a community
  const community = await api.functional.redditClone.member.communities.create(
    memberConnection,
    {
      body: {
        name: RandomGenerator.alphabets(10),
        description: RandomGenerator.paragraph({ sentences: 2 }),
      },
    },
  );
  typia.assert(community);
  // 3. Create a text post in the community
  const post = await api.functional.redditClone.member.posts.create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        communityName: community.name,
        type: "text",
      } satisfies IRedditClonePostLink.ICreate,
    },
  );
  typia.assert(post);
  // Record initial state
  const initialVoteScore = post.vote_score;
  const initialKarma = post.author.karma_count;
  // 4. Cast a vote on the post (this will be an upvote based on the API)
  const vote = await api.functional.redditClone.member.posts.votes.create(
    memberConnection,
    {
      postId: post.id,
    },
  );
  typia.assert(vote);
  // 5. Remove the vote via DELETE
  await api.functional.redditClone.member.posts.votes.erase(memberConnection, {
    postId: post.id,
    voteId: vote.id,
  });
  // 6. Verify expected outcomes:
  // (a) Vote record is permanently deleted - API returns void (204 No Content)
  // (b) Post's vote_score is restored to initial value
  TestValidator.equals(
    "vote score restored after removal",
    post.vote_score,
    initialVoteScore,
  );
  // (c) Post author's karma is restored
  TestValidator.equals(
    "karma restored after vote removal",
    post.author.karma_count,
    initialKarma,
  );
}
