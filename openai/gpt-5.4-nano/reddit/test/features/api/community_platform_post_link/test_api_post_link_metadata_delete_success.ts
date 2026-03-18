import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_admin_posts_create } from "../../../generate/generate_random_community_platform_admin_posts_create";
import { generate_random_community_platform_admin_posts_link_attach_post_link } from "../../../generate/generate_random_community_platform_admin_posts_link_attach_post_link";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";

export async function test_api_post_link_metadata_delete_success(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin actor auth (join + login)
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  } satisfies ICommunityPlatformAdmin.IJoin;
  await authorize_admin_join(adminConnection, { body: adminJoinBody });
  const adminLoginBody = {
    email: adminJoinBody.email,
    password: adminJoinBody.password,
  } satisfies ICommunityPlatformAdmin.ILogin;
  await authorize_admin_login(adminConnection, { body: adminLoginBody });
  // 2) Create a community
  const community = await generate_random_community_platform_communities_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href: `https://example.com/${RandomGenerator.alphabets(8)}.png`,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // 3) Create a link-type post in that community
  const postLinkHref = `https://example.com/${RandomGenerator.alphabets(10)}`;
  const postCreateBody = {
    community_id: community.id,
    post_type: "link",
    title: RandomGenerator.name(3),
    link: {
      href: postLinkHref,
      display_title: RandomGenerator.name(2),
      display_description: RandomGenerator.paragraph({ sentences: 2 }),
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const createdPost = await (
    generate_random_community_platform_admin_posts_create as unknown as (
      connection: api.IConnection,
      props: {
        body: ICommunityPlatformPost.ICreate;
      },
    ) => Promise<ICommunityPlatformPost>
  )(adminConnection, {
    body: postCreateBody,
  });
  typia.assert(createdPost);
  // 4) Attach/create link metadata (1:1)
  const linkMeta = {
    href: postLinkHref,
    displayTitle: RandomGenerator.name(2),
    displayDescription: RandomGenerator.paragraph({ sentences: 2 }),
  } satisfies ICommunityPlatformPostLink.ICreate;
  const postWithLinkMeta =
    await generate_random_community_platform_admin_posts_link_attach_post_link(
      adminConnection,
      {
        params: {
          postId: createdPost.id,
        },
        body: linkMeta,
      },
    );
  typia.assert(postWithLinkMeta);
  // Ensure link rendering exists before deletion
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: undefined,
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: null,
    } satisfies ICommunityPlatformMember.ILogin,
  });
  const before = await api.functional.communityPlatform.member.posts.at(
    memberConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(before);
  TestValidator.predicate(
    "has link content before deletion",
    before.linkContent !== null,
  );
  // 5) Delete link metadata
  await api.functional.communityPlatform.admin.posts.link.erasePostLink(
    adminConnection,
    {
      postId: createdPost.id,
    },
  );
  // 6) Verify post detail no longer has link rendering fields derived from link metadata
  const after = await api.functional.communityPlatform.member.posts.at(
    memberConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(after);
  TestValidator.equals("post id unchanged", after.id, createdPost.id);
  TestValidator.equals("link content removed", after.linkContent, null);
}
