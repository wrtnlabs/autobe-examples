import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPost";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_posts_index_soft_deleted_excluded_and_author_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1) Authenticate as member (author)
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(authorAuth);
  const authorId = authorAuth.id;
  // 2) Create a community
  const community = await generate_random_community_platform_communities_create(
    authorConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png",
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Subscribe author to community
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      authorConnection,
      {
        body: {
          community_id: community.id,
        } satisfies ICommunityPlatformCommunitySubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // Titles used to locate created posts via index
  const postCTitle = `post-c-${RandomGenerator.alphabets(8)}`;
  const postDTitle = `post-d-${RandomGenerator.alphabets(8)}`;
  // Create Post C (to be deleted)
  await api.functional.communityPlatform.member.posts.create(authorConnection, {
    body: {
      community_id: community.id,
      post_type: "text",
      title: postCTitle,
      body_text: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // Create Post D (active)
  await api.functional.communityPlatform.member.posts.create(authorConnection, {
    body: {
      community_id: community.id,
      post_type: "text",
      title: postDTitle,
      body_text: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies ICommunityPlatformPost.ICreate,
  });
  // Index to retrieve post IDs
  const initialPage = await api.functional.communityPlatform.member.posts.index(
    authorConnection,
    {
      body: {
        communityId: community.id,
        authorId,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(initialPage);
  const postC = initialPage.data.find((p) => p.title === postCTitle);
  const postD = initialPage.data.find((p) => p.title === postDTitle);
  if (!postC) throw new Error("Post C not found in index results");
  if (!postD) throw new Error("Post D not found in index results");
  // Soft-delete Post C as author
  await api.functional.communityPlatform.member.posts.erase(authorConnection, {
    postId: postC.id,
  });
  // Index again with communityId and authorId
  const page = await api.functional.communityPlatform.member.posts.index(
    authorConnection,
    {
      body: {
        communityId: community.id,
        authorId,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(page);
  const ids = page.data.map((p) => p.id);
  TestValidator.predicate("includes active post", () => ids.includes(postD.id));
  TestValidator.predicate(
    "excludes deleted post",
    () => !ids.includes(postC.id),
  );
  TestValidator.predicate("no returned posts are soft-deleted", () =>
    page.data.every((p) => p.deletedAt === null),
  );
  // Call again with authorId filter set to a different member that has no matching posts
  const otherConnection: api.IConnection = { host: connection.host };
  const otherAuth = await authorize_member_join(otherConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
    },
  });
  typia.assert(otherAuth);
  // Ensure other member can browse by subscribing them to the same community
  await generate_random_community_platform_community_subscriptions_create(
    otherConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  const emptyPage = await api.functional.communityPlatform.member.posts.index(
    otherConnection,
    {
      body: {
        communityId: community.id,
        authorId: otherAuth.id,
        page: 1,
        limit: 10,
      } satisfies ICommunityPlatformPost.IRequest,
    },
  );
  typia.assert(emptyPage);
  TestValidator.equals("empty data array", emptyPage.data.length, 0);
  TestValidator.equals("pagination records", emptyPage.pagination.records, 0);
  TestValidator.equals("pagination pages", emptyPage.pagination.pages, 0);
}
