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

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_vote_remove_vote(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register and join user
  const userJoinConnection: api.IConnection = { host: connection.host };
  const user: ICommunityPlatformUser.IAuthorized = await authorize_user_join(
    userJoinConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        username: RandomGenerator.name(1),
        displayName: RandomGenerator.name(1),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: null,
      },
    },
  );
  typia.assert(user);
  // Create user connection with auth
  const userConnection: api.IConnection = {
    host: connection.host,
    headers: { Authorization: user.token.access },
  };
  // 2. Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(1),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // 3. Create post in community (text post)
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: {
          title: RandomGenerator.name(1),
          postType: "text",
          ...({ content: RandomGenerator.paragraph({ sentences: 5 }) } as any),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post);
  // 4. User casts initial vote (upvote)
  const initialVoteBody: ICommunityPlatformPostVote.IUpdate = {
    voteType: "upvote",
  };
  const initialVote =
    await api.functional.communityPlatform.user.posts.votes.updateVote(
      userConnection,
      {
        postId: post.id,
        body: initialVoteBody,
      },
    );
  typia.assert(initialVote);
  TestValidator.predicate(
    "Initial vote has upvotes or downvotes",
    initialVote.upvotes > 0 || initialVote.downvotes > 0,
  );
  // 5. Remove vote (voteType: null)
  const removeVoteBody: ICommunityPlatformPostVote.IUpdate = { voteType: null };
  const removedVote =
    await api.functional.communityPlatform.user.posts.votes.updateVote(
      userConnection,
      {
        postId: post.id,
        body: removeVoteBody,
      },
    );
  typia.assert(removedVote);
  // 6. Verify zero votes after removal
  TestValidator.equals(
    "Upvotes are zero after removal",
    removedVote.upvotes,
    0,
  );
  TestValidator.equals(
    "Downvotes are zero after removal",
    removedVote.downvotes,
    0,
  );
}
