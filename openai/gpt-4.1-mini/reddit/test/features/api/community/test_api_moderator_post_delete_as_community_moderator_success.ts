import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_moderator_post_delete_as_community_moderator_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup who will act as the deleter (not the author)
  const moderatorPassword = RandomGenerator.alphaNumeric(16);
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorJoinConnection: api.IConnection = { host: connection.host };
  // Moderator join does not accept password in join body, remove it
  const moderatorJoined = await authorize_moderator_join(
    moderatorJoinConnection,
    {
      body: {
        email: moderatorEmail,
        username: RandomGenerator.name(2),
        displayName: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 3 }),
        avatarUrl: null,
      },
    },
  );
  typia.assert(moderatorJoined);
  const moderatorLoginConnection: api.IConnection = { host: connection.host };
  const moderatorAuthorized = await authorize_moderator_login(
    moderatorLoginConnection,
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      },
    },
  );
  typia.assert(moderatorAuthorized);
  // 2. User setup who will create the post
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userEmail = typia.random<string & tags.Format<"email">>();
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userJoined = await authorize_user_join(userJoinConnection, {
    body: {
      email: userEmail,
      password: userPassword, // password allowed here
      username: RandomGenerator.name(2),
      displayName: RandomGenerator.name(1),
      href: "https://example.com",
      referrer: "https://referrer.com",
    },
  });
  typia.assert(userJoined);
  const userLoginConnection: api.IConnection = { host: connection.host };
  const userAuthorized = await authorize_user_login(userLoginConnection, {
    body: {
      email: userEmail,
      password: userPassword,
    },
  });
  typia.assert(userAuthorized);
  // 3. User creates a community
  const userCommunityConnection: api.IConnection = { host: connection.host };
  userCommunityConnection.headers = userLoginConnection.headers;
  const community =
    await generate_random_community_platform_user_communities_create(
      userCommunityConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconUrl: `https://avatars.dicebear.com/api/identicon/${RandomGenerator.alphaNumeric(8)}.svg`,
        },
      },
    );
  typia.assert(community);
  // 4. User creates a post in the community
  const userPostConnection: api.IConnection = { host: connection.host };
  userPostConnection.headers = userLoginConnection.headers;
  const postBody: ICommunityPlatformPost.ICreate = {
    title: RandomGenerator.name(5),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  };
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userPostConnection,
      {
        communityId: community.id,
        body: postBody,
      },
    );
  typia.assert(post);
  // 5. Moderator deletes the post
  const moderatorConnection: api.IConnection = { host: connection.host };
  moderatorConnection.headers = {
    Authorization: moderatorAuthorized.token.access,
  };
  const deletedPost =
    await api.functional.communityPlatform.moderator.communities.posts._delete.erasePost(
      moderatorConnection,
      {
        communityId: community.id,
        postId: post.id,
      },
    );
  typia.assert(deletedPost);
  // 6. Validate the post is deleted - deletedAt is not null
  TestValidator.predicate(
    "deletedAt is not null after deletion",
    deletedPost.deletedAt !== null,
  );
  TestValidator.equals("post id matches", deletedPost.id, post.id);
  TestValidator.equals(
    "community id matches",
    deletedPost.communityId,
    community.id,
  );
  // Further cascading delete validation is assumed but cannot be explicitly checked without comments/votes APIs
}
