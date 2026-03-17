import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfile";
import type { ICommunityPlatformProfileFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileFile";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_member_communities_create } from "../../../generate/generate_random_community_platform_member_communities_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { generate_random_community_platform_member_posts_links_create } from "../../../generate/generate_random_community_platform_member_posts_links_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_post_link_update_rejected_for_non_author(
  connection: api.IConnection,
): Promise<void> {
  const authorConnection: api.IConnection = { host: connection.host };
  const authorAuth = await authorize_member_join(authorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(authorAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      authorConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(community);
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalTargetUrl =
    `https://original-${RandomGenerator.alphabets(6)}.example.com/${RandomGenerator.alphabets(8)}` satisfies string as string &
      tags.Format<"uri">;
  const intruderTargetUrl =
    `https://updated-${RandomGenerator.alphabets(6)}.example.org/${RandomGenerator.alphabets(8)}` satisfies string as string &
      tags.Format<"uri">;
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: originalTitle,
        community_platform_community_id: community.id,
        post_type: "link",
      },
    },
  );
  typia.assert(post);
  const link =
    await generate_random_community_platform_member_posts_links_create(
      authorConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          target_url: originalTargetUrl,
        },
      },
    );
  typia.assert(link);
  const snapshotPostTitle = post.title;
  const snapshotPostAuthorId = post.author.id;
  const snapshotPostCommunityId = post.community.id;
  const snapshotLinkTargetUrl = link.target_url;
  const snapshotLinkDomainDisplay = link.domain_display;
  const snapshotLinkPostId = link.post.id;
  const intruderConnection: api.IConnection = { host: connection.host };
  const intruderAuth = await authorize_member_join(intruderConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(intruderAuth);
  const forbiddenUpdate = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    target_url: intruderTargetUrl,
  } satisfies ICommunityPlatformPost.IUpdate;
  await TestValidator.error(
    "non-author cannot update another member's link post",
    async () => {
      await api.functional.communityPlatform.member.posts.links.update(
        intruderConnection,
        {
          postId: post.id,
          linkId: link.id,
          body: forbiddenUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "original post title remains unchanged",
    snapshotPostTitle,
    originalTitle,
  );
  TestValidator.equals(
    "post author remains original author",
    snapshotPostAuthorId,
    post.author.id,
  );
  TestValidator.equals(
    "post community remains unchanged",
    snapshotPostCommunityId,
    community.id,
  );
  TestValidator.equals(
    "original link target_url remains unchanged",
    snapshotLinkTargetUrl,
    originalTargetUrl,
  );
  TestValidator.equals(
    "original link domain_display remains unchanged",
    snapshotLinkDomainDisplay,
    link.domain_display,
  );
  TestValidator.notEquals(
    "original link target_url was not replaced by rejected value",
    snapshotLinkTargetUrl,
    intruderTargetUrl,
  );
  TestValidator.equals(
    "link remains attached to same parent post",
    snapshotLinkPostId,
    post.id,
  );
}
