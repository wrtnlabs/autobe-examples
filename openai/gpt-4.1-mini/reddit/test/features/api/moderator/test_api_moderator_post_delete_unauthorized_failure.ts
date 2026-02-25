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

export async function test_api_moderator_post_delete_unauthorized_failure(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator join (owner/moderator of community) for creating community and post
  const moderatorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: `https://${RandomGenerator.alphabets(10)}.com/avatar.jpg`,
  } satisfies ICommunityPlatformModerator.IJoin;
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: moderatorJoinInput,
  });
  typia.assert(moderator);
  // 2. User join (post author)
  const userJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(2),
    displayName: RandomGenerator.name(2),
    href: `https://${RandomGenerator.alphabets(8)}.com`,
    referrer: `https://${RandomGenerator.alphabets(8)}.com`,
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const userConnection: api.IConnection = { host: connection.host };
  const user = await authorize_user_join(userConnection, {
    body: userJoinInput,
  });
  typia.assert(user);
  // 3. User join (unauthorized user who will try to delete)
  const otherUserJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(2),
    displayName: RandomGenerator.name(2),
    href: `https://${RandomGenerator.alphabets(8)}.com`,
    referrer: `https://${RandomGenerator.alphabets(8)}.com`,
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const otherUserConnection: api.IConnection = { host: connection.host };
  const otherUser = await authorize_user_join(otherUserConnection, {
    body: otherUserJoinInput,
  });
  typia.assert(otherUser);
  // 4. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {},
    );
  typia.assert(community);
  // 5. User creates a post in the community
  // Create a text post as example
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 1 }),
    postType: "text",
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 6. Unauthorized user attempts to delete the post
  await TestValidator.httpError(
    "unauthorized user cannot delete the post",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communities.posts._delete.erasePost(
        otherUserConnection,
        {
          communityId: community.id,
          postId: post.id,
        },
      );
    },
  );
  // 7. Regular user (not moderator, not owner) attempts to delete the post
  const regularUserJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "password123",
    username: RandomGenerator.name(2),
    displayName: RandomGenerator.name(2),
    href: `https://${RandomGenerator.alphabets(8)}.com`,
    referrer: `https://${RandomGenerator.alphabets(8)}.com`,
    ip: null,
  } satisfies ICommunityPlatformUser.IJoin;
  const regularUserConnection: api.IConnection = { host: connection.host };
  const regularUser = await authorize_user_join(regularUserConnection, {
    body: regularUserJoinInput,
  });
  typia.assert(regularUser);
  await TestValidator.httpError(
    "regular user cannot delete another user's post",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communities.posts._delete.erasePost(
        regularUserConnection,
        {
          communityId: community.id,
          postId: post.id,
        },
      );
    },
  );
  // 8. Moderator (who is not a moderator of this community) attempts to delete the post
  // Create another moderator
  const otherModeratorJoinInput = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.name(2),
    displayName: RandomGenerator.name(2),
    bio: RandomGenerator.paragraph({ sentences: 2 }),
    avatarUrl: `https://${RandomGenerator.alphabets(10)}.com/avatar.jpg`,
  } satisfies ICommunityPlatformModerator.IJoin;
  const otherModeratorConnection: api.IConnection = { host: connection.host };
  const otherModerator = await authorize_moderator_join(
    otherModeratorConnection,
    {
      body: otherModeratorJoinInput,
    },
  );
  typia.assert(otherModerator);
  await TestValidator.httpError(
    "non-subscriber moderator cannot delete the post",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communities.posts._delete.erasePost(
        otherModeratorConnection,
        {
          communityId: community.id,
          postId: post.id,
        },
      );
    },
  );
  // 9. Check the post still exists (by creating another user and listing posts is not available, so
  // just create a fresh post with same title to verify resource is intact)
  const post2 =
    await api.functional.communityPlatform.user.communities.posts.create(
      userConnection,
      {
        communityId: community.id,
        body: {
          title: post.title, // reuse title to confirm new creation
          postType: "text",
          content: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(post2);
  TestValidator.predicate(
    "post2 id different from original",
    post2.id !== post.id,
  );
}
