import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostVote";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_votes_create_vote } from "../../../generate/generate_random_community_platform_user_posts_votes_create_vote";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_vote } from "../../../prepare/prepare_random_community_platform_post_vote";

export async function test_api_post_vote_moderator_vote_deletion(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  // 2. Create community as moderator
  const community =
    await generate_random_community_platform_user_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.alphabets(10),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          iconUrl: `https://example.com/icon/${RandomGenerator.alphaNumeric(8)}.png`,
        },
      },
    );
  // 3. Create post in the community
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.name(2),
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // 4. User joins
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password",
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  // 5. User creates vote on the post
  const vote =
    await generate_random_community_platform_user_posts_votes_create_vote(
      userConnection,
      {
        params: { postId: post.id },
        body: {
          post_id: post.id,
          vote_type: "upvote",
        },
      },
    );
  typia.assert(vote);
  // 6. Determine vote id dynamically and delete the user's vote by voteId
  const voteId = (vote as any).id ?? (vote as any).voteId ?? (vote as any).post_vote_id ?? "";
  await api.functional.communityPlatform.user.posts.votes.erase(
    moderatorConnection,
    {
      postId: post.id,
      voteId: typia.assert<string>(voteId),
    },
  );
  // 7. Verify that the vote is removed by attempting to delete again yields error
  await TestValidator.error(
    "deleting non-existent vote results in 404",
    async () =>
      await api.functional.communityPlatform.user.posts.votes.erase(
        moderatorConnection,
        {
          postId: post.id,
          voteId: typia.assert<string>(voteId),
        },
      ),
  );
}
