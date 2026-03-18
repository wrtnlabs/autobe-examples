import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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

export async function test_api_post_link_metadata_delete_own_link_post_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Member join/auth
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "TestPassword123!",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const authorizedConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(authorizedConnection, {
    body: {
      email: memberAuth.id satisfies unknown as string,
      password: "TestPassword123!",
    } as unknown as ICommunityPlatformMember.ILogin,
  });
  // 2) Create community owned by member and subscribe
  const community = await generate_random_community_platform_communities_create(
    authorizedConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: "https://example.com/icon.png",
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  await generate_random_community_platform_community_subscriptions_create(
    authorizedConnection,
    {
      body: {
        community_id: community.id,
      } satisfies ICommunityPlatformCommunitySubscription.ICreate,
    },
  );
  // 3) Create link post
  const href = "https://example.com/some-page";
  const displayTitle = RandomGenerator.name();
  const displayDescription = RandomGenerator.paragraph({ sentences: 2 });
  const title = RandomGenerator.name();
  const postCreateBody = {
    community_id: community.id,
    post_type: "link",
    title,
    link: {
      href: href as string & tags.Format<"uri">,
      display_title: displayTitle,
      display_description: displayDescription,
    },
  } satisfies ICommunityPlatformPost.ICreate;
  await api.functional.communityPlatform.member.posts.create(
    authorizedConnection,
    {
      body: postCreateBody,
    },
  );
  // fetch to get id because posts.create returns void in SDK
  const createdPostList =
    await api.functional.communityPlatform.member.posts.at(
      authorizedConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  const postId = createdPostList.id;
  const before = await api.functional.communityPlatform.member.posts.at(
    authorizedConnection,
    { postId },
  );
  typia.assert(before);
  TestValidator.equals(
    "postType is link before delete",
    before.postType,
    "link",
  );
  TestValidator.predicate(
    "linkContent exists before delete",
    before.linkContent === null ? false : true,
  );
  // 4) Delete link metadata
  await api.functional.communityPlatform.member.posts.link.erasePostLink(
    authorizedConnection,
    {
      postId,
    },
  );
  // 5) Verify null linkContent after delete (idempotent)
  const after1 = await api.functional.communityPlatform.member.posts.at(
    authorizedConnection,
    { postId },
  );
  typia.assert(after1);
  TestValidator.equals("postType remains link", after1.postType, "link");
  TestValidator.equals("linkContent removed", after1.linkContent, null);
  const after2 = await api.functional.communityPlatform.member.posts.at(
    authorizedConnection,
    { postId },
  );
  typia.assert(after2);
  TestValidator.equals("linkContent stays null", after2.linkContent, null);
}
