import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityCommunity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPost";
import type { IRedditCommunityPostFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPostFile";
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
import { generate_random_reddit_community_member_posts_create } from "../../../generate/generate_random_reddit_community_member_posts_create";
import { generate_random_reddit_community_member_posts_votes_create } from "../../../generate/generate_random_reddit_community_member_posts_votes_create";
import { generate_random_reddit_community_member_subscriptions_create } from "../../../generate/generate_random_reddit_community_member_subscriptions_create";
import { prepare_random_reddit_community_post } from "../../../prepare/prepare_random_reddit_community_post";
import { prepare_random_reddit_community_post_file } from "../../../prepare/prepare_random_reddit_community_post_file";
import { prepare_random_reddit_community_post_vote } from "../../../prepare/prepare_random_reddit_community_post_vote";
import { prepare_random_reddit_community_subscription } from "../../../prepare/prepare_random_reddit_community_subscription";

export async function test_api_member_vote_not_belonging_post(
  connection: api.IConnection,
): Promise<void> {
  // 1. Member authentication
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      href: "http://test.local",
      referrer: "http://test.local/join",
    },
  });
  typia.assert(memberAuth);
  memberConnection.headers!.Authorization = memberAuth.token.access;
  // 2. Browse communities and subscribe to one
  const browseResult =
    await api.functional.redditCommunity.member.browse_communities.browse(
      memberConnection,
    );
  typia.assert(browseResult);
  const community = browseResult.data[0];
  typia.assert(community);
  const subscription =
    await api.functional.redditCommunity.member.subscriptions.create(
      memberConnection,
      {
        body: {
          reddit_community_communities_id: community.id,
        },
      },
    );
  typia.assert(subscription);
  // 3. Create Post A (the post that will receive the vote)
  const postA = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Post A - The one that will have a vote",
        post_type: "text",
        reddit_community_community_id: community.id,
        text_content: "This is the content of Post A. It will receive a vote.",
      },
    },
  );
  typia.assert(postA);
  // 4. Create Post B (the post ID will be used in the test path)
  const postB = await api.functional.redditCommunity.member.posts.create(
    memberConnection,
    {
      body: {
        title: "Post B - The one we'll query in the path",
        post_type: "text",
        reddit_community_community_id: community.id,
        text_content:
          "This is the content of Post B. We'll use its ID in the path.",
      },
    },
  );
  typia.assert(postB);
  // 5. Cast a vote on Post A (creating a vote record with post_id = Post A's id)
  const vote = await api.functional.redditCommunity.member.posts.votes.create(
    memberConnection,
    {
      postId: postA.id,
      body: {
        vote_type: "upvote",
      },
    },
  );
  typia.assert(vote);
  // Verify the vote belongs to Post A
  TestValidator.equals("vote belongs to post A", vote.post.id, postA.id);
  // 6. Attempt to retrieve the vote using Post B's ID in the path (vote belongs to A, but path says B)
  // This should return 404 because the vote's post_id != postId parameter
  await TestValidator.httpError(
    "vote not belonging to specified post returns 404",
    404,
    async () => {
      await api.functional.redditCommunity.member.posts.votes.at(
        memberConnection,
        {
          postId: postB.id,
          voteId: vote.id,
        },
      );
    },
  );
  // 7. Verify no data leakage - vote details from Post A should not be exposed
  // The 404 response should not contain any vote information
}
