import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
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
import { generate_random_community_platform_user_posts_link_update_post_link } from "../../../generate/generate_random_community_platform_user_posts_link_update_post_link";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_update_by_author_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Register a new user and get authorized connection
  const userConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_user_join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "P@ssword1234",
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    },
  });
  userConnection.headers = { Authorization: authorized.token.access };
  // 2. Create a community as the authorized user
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphabets(8),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          iconUrl: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
        },
      },
    );
  typia.assert(community);
  // 3. Create a link-type post in the community
  const originalUrl = `https://${RandomGenerator.alphabets(8)}.com/${RandomGenerator.alphabets(5)}`;
  const postCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    postType: "link" as const,
    url: originalUrl,
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
  // 4. Update the post's link URL
  const newUrl = `https://${RandomGenerator.alphabets(8)}.org/${RandomGenerator.alphabets(5)}`;
  const updateBody = {
    community_platform_post_id: post.id,
    url: newUrl,
  } satisfies ICommunityPlatformPostLink.ICreate;
  const updatedLink =
    await generate_random_community_platform_user_posts_link_update_post_link(
      userConnection,
      {
        body: updateBody,
        params: { postId: post.id },
      },
    );
  typia.assert(updatedLink);
  // Validations
  TestValidator.equals(
    "Post ID matches",
    updatedLink.community_platform_post_id,
    post.id,
  );
  TestValidator.equals("URL was updated", updatedLink.url, newUrl);
  TestValidator.predicate(
    "created_at is valid date",
    !isNaN(new Date(updatedLink.created_at).getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid date",
    !isNaN(new Date(updatedLink.updated_at).getTime()),
  );
  TestValidator.equals("deleted_at is null", updatedLink.deleted_at, null);
}
