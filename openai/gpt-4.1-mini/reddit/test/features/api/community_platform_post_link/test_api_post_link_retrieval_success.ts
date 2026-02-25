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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_post_link_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator joins
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorJoin = await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 3 }),
      avatarUrl: "https://example.com/avatar.jpg",
    },
  });
  typia.assert(moderatorJoin);
  // 2. User joins and logs in
  const userJoinConnection: api.IConnection = { host: connection.host };
  const userPassword = RandomGenerator.alphaNumeric(16);
  const userJoin = await authorize_user_join(userJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: userPassword,
      username: RandomGenerator.name(1),
      displayName: RandomGenerator.name(1),
      href: "https://example.com",
      referrer: "https://referrer.example.com",
      ip: null,
    },
  });
  typia.assert(userJoin);
  const userConnection: api.IConnection = { host: connection.host };
  const userLogin = await authorize_user_login(userConnection, {
    body: {
      email: userJoin.email,
      password: userPassword,
    },
  });
  typia.assert(userLogin);
  // 3. User creates a community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.name(1) + "_comm",
          description: RandomGenerator.paragraph({ sentences: 5 }),
          iconUrl: "https://example.com/icon.png",
        },
      },
    );
  typia.assert(community);
  // 4. User creates a link-type post in the community
  const linkUrl = "https://www.examplelink.com/article";
  const postCreateBody = {
    title: RandomGenerator.name(3),
    postType: "link" as const,
    url: linkUrl,
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
  // 5. Moderator retrieves detailed link content for the post
  const postLink =
    await api.functional.communityPlatform.moderator.posts.link.atLink(
      moderatorConnection,
      {
        postId: post.id,
      },
    );
  typia.assert(postLink);
  // 6. Validate the returned link content
  TestValidator.equals("post link url matches", postLink.url, linkUrl);
  TestValidator.equals(
    "post link post ID matches",
    postLink.community_platform_post_id,
    post.id,
  );
  TestValidator.predicate(
    "post link createdAt valid",
    Date.parse(postLink.created_at) > 0,
  );
  TestValidator.predicate(
    "post link updatedAt valid",
    Date.parse(postLink.updated_at) > 0,
  );
  TestValidator.predicate(
    "post link deletedAt nullable",
    postLink.deleted_at === null || postLink.deleted_at === undefined,
  );
}
