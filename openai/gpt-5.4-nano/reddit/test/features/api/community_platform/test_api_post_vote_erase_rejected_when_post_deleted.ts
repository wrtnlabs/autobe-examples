import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import typia, { tags } from "typia";
import { RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";

export async function test_api_post_vote_erase_rejected_when_post_deleted(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });

  const communityConnection: api.IConnection = { host: connection.host };
  communityConnection.headers = memberConnection.headers;
  const community = await generate_random_community_platform_communities_create(
    communityConnection,
    {
      body: {
        name: `community-${RandomGenerator.alphabets(8)}`,
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/icon/${RandomGenerator.alphabets(6)}.png`,
      },
    },
  );
  typia.assert(community);

  const subscriptionConnection: api.IConnection = { host: connection.host };
  subscriptionConnection.headers = memberConnection.headers;
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      subscriptionConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);

  // Create a post (directly, because we need postId)
  const postConnection: api.IConnection = { host: connection.host };
  postConnection.headers = memberConnection.headers;

  const createdPostTitle = `post-${RandomGenerator.alphabets(10)}`;
  const postCreateBody = {
    community_id: community.id,
    post_type: "text",
    title: createdPostTitle,
    body_text: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;

  const createdPostResult = await api.functional.communityPlatform.member.posts.create(
    postConnection,
    { body: postCreateBody },
  );
  typia.assert(createdPostResult);

  const postId = (
    createdPostResult as unknown as {
      id: string;
    }
  ).id;

  // Cast a vote and capture voteId
  const votesConnection: api.IConnection = { host: connection.host };
  votesConnection.headers = memberConnection.headers;

  const voteResult = await api.functional.communityPlatform.member.posts.votes.create(
    votesConnection,
    {
      postId,
      body: typia.assert(
        {
          community_id: community.id,
          post_type: "text",
          vote: "up",
        } as any,
      ),
    },
  );
  typia.assert(voteResult);

  const voteId = (
    voteResult as unknown as {
      id: string;
    }
  ).id;

  // Delete the post
  await api.functional.communityPlatform.member.posts.erase(postConnection, {
    postId,
  });

  // Attempt vote erase should be rejected
  await TestValidator.error(
    "vote erase rejected when post deleted",
    async () => {
      await api.functional.communityPlatform.member.posts.votes.erase(
        votesConnection,
        {
          postId,
          voteId,
        },
      );
    },
  );
}
