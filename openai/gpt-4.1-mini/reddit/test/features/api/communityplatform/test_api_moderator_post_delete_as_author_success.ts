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

export async function test_api_moderator_post_delete_as_author_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins and logs in
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<string>(),
      displayName: RandomGenerator.name(),
      bio: null,
      avatarUrl: null,
    },
  });
  typia.assert(moderatorAuth);
  moderatorConnection.headers = { Authorization: moderatorAuth.token.access };
  // 2. Moderator creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      moderatorConnection,
      {
        body: {
          name: RandomGenerator.name() + "-community",
          description: RandomGenerator.paragraph({ sentences: 2 }),
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // 3. Moderator creates a post authored by themselves in the community
  const postCreateBody = {
    title: RandomGenerator.name(),
    postType: "text" as const,
    content: RandomGenerator.paragraph({ sentences: 3 }),
  } satisfies ICommunityPlatformPost.ICreate;
  const post =
    await api.functional.communityPlatform.user.communities.posts.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: postCreateBody,
      },
    );
  typia.assert(post);
  // 4. Moderator deletes the post via delete API
  const deletedPost =
    await api.functional.communityPlatform.moderator.communities.posts._delete.erasePost(
      moderatorConnection,
      {
        communityId: community.id,
        postId: post.id,
      },
    );
  typia.assert(deletedPost);
  // 5. Validate deletion - the return post should match the created post
  TestValidator.equals("deleted post id", deletedPost.id, post.id);
  TestValidator.equals(
    "deleted post community id",
    deletedPost.communityId,
    community.id,
  );
  TestValidator.equals("deleted post title", deletedPost.title, post.title);
  TestValidator.equals(
    "deleted post author moderator id",
    deletedPost.authorModeratorId,
    moderatorAuth.id,
  );
}
