import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_vote_by_admin_successful_vote_casting_and_update(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin join and login
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinedRaw = await authorize_admin_join(adminJoinConnection, {
    body: { password: adminPassword },
  });
  const adminJoined =
    typia.assert<ICommunityPlatformAdmin.IAuthorized>(adminJoinedRaw);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoined.email,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. User join and login (needed to create community)
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoinedRaw = await authorize_user_join(userJoinConnection, {
    body: { password: userPassword },
  });
  const userJoined =
    typia.assert<ICommunityPlatformUser.IAuthorized>(userJoinedRaw);
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_login(userConnection, {
    body: {
      email: userJoined.email,
      password: userPassword,
    } satisfies ICommunityPlatformUser.ILogin,
  });
  // 3. Create a community by user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: `testcommunity-${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: "https://via.placeholder.com/150",
        },
      },
    );
  typia.assert(community);
  // 4. Create a post in the community by user
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(3),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 5 }),
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 5. Cast initial upvote by admin
  const initialVote =
    await api.functional.communityPlatform.admin.posts.votes.updateVote(
      adminConnection,
      {
        postId: post.id,
        body: {
          voteType: "upvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(initialVote);
  TestValidator.predicate("post upvotes > 0", initialVote.upvotes > 0);
  TestValidator.equals("post downvotes", initialVote.downvotes, 0);
  // 6. Cast downvote by admin again (change vote)
  const changedVote =
    await api.functional.communityPlatform.admin.posts.votes.updateVote(
      adminConnection,
      {
        postId: post.id,
        body: {
          voteType: "downvote",
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(changedVote);
  TestValidator.predicate("post downvotes > 0", changedVote.downvotes > 0);
  TestValidator.predicate("post upvotes >= 0", changedVote.upvotes >= 0);
  TestValidator.predicate(
    "post vote counts changed",
    changedVote.upvotes !== initialVote.upvotes ||
      changedVote.downvotes !== initialVote.downvotes,
  );
  // 7. Remove vote by admin (voteType null)
  const removedVote =
    await api.functional.communityPlatform.admin.posts.votes.updateVote(
      adminConnection,
      {
        postId: post.id,
        body: {
          voteType: null,
        } satisfies ICommunityPlatformPostVote.IUpdate,
      },
    );
  typia.assert(removedVote);
  TestValidator.predicate(
    "post upvotes remain same after remove",
    removedVote.upvotes === changedVote.upvotes,
  );
  TestValidator.predicate(
    "post downvotes decremented after remove",
    removedVote.downvotes === changedVote.downvotes - 1,
  );
}
