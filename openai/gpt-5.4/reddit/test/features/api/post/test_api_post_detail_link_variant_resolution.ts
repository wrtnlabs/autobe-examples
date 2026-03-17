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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_post_detail_link_variant_resolution(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const authorized = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const targetUrl = `https://example.com/${RandomGenerator.alphabets(10)}`;
  const postTitle = RandomGenerator.paragraph({ sentences: 4 });
  const created = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: postTitle,
        community_platform_community_id: community.id,
        post_type: "link",
        link: {
          target_url: targetUrl,
        } satisfies ICommunityPlatformPostLink.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(created);
  const detail = await api.functional.communityPlatform.posts.at(
    memberConnection,
    {
      postId: created.id,
    },
  );
  typia.assert(detail);
  TestValidator.equals("detail id matches created post", detail.id, created.id);
  TestValidator.equals(
    "detail title matches created post",
    detail.title,
    created.title,
  );
  TestValidator.equals(
    "detail post type matches created post",
    detail.post_type,
    created.post_type,
  );
  TestValidator.equals(
    "detail author matches created post",
    detail.author.id,
    created.author.id,
  );
  TestValidator.equals(
    "detail community matches created post",
    detail.community.id,
    created.community.id,
  );
  TestValidator.predicate("link subtype is resolved", detail.link !== null);
  if (detail.link === null) {
    throw new Error("Expected link subtype to be resolved.");
  }
  const link = detail.link;
  TestValidator.equals(
    "link target url matches input",
    link.target_url,
    targetUrl,
  );
  TestValidator.equals(
    "link parent post id matches detail id",
    link.post.id,
    detail.id,
  );
  TestValidator.predicate(
    "link domain display is populated",
    link.domain_display.length > 0,
  );
  TestValidator.equals(
    "text content is null for link variant",
    detail.textContent,
    null,
  );
  TestValidator.equals(
    "post image is null for link variant",
    detail.postImage,
    null,
  );
  TestValidator.equals("initial vote score is zero", detail.voteScore, 0);
  TestValidator.equals("initial comment count is zero", detail.commentCount, 0);
}
