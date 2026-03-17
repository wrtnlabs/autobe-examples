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

export async function test_api_post_link_update_by_author(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalTargetUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        community_platform_community_id: community.id,
        post_type: "link",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const link =
    await generate_random_community_platform_member_posts_links_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          target_url: originalTargetUrl,
        } satisfies ICommunityPlatformPostLink.ICreate,
      },
    );
  typia.assert(link);
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedTargetUrl: string & tags.Format<"uri"> = typia.random<
    string & tags.Format<"uri">
  >();
  const updated =
    await api.functional.communityPlatform.member.posts.links.update(
      memberConnection,
      {
        postId: post.id,
        linkId: link.id,
        body: {
          title: updatedTitle,
          target_url: updatedTargetUrl,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("post id is preserved", updated.id, post.id);
  TestValidator.equals("title is updated", updated.title, updatedTitle);
  TestValidator.equals(
    "post type is preserved",
    updated.post_type,
    post.post_type,
  );
  TestValidator.equals("author is preserved", updated.author, post.author);
  TestValidator.equals(
    "community is preserved",
    updated.community,
    post.community,
  );
  TestValidator.notEquals("link exists after update", updated.link, null);
  TestValidator.equals("link id is preserved", updated.link!.id, link.id);
  TestValidator.equals(
    "link remains attached to the post",
    updated.link!.post.id,
    post.id,
  );
  TestValidator.equals(
    "link target url is updated",
    updated.link!.target_url,
    updatedTargetUrl,
  );
  TestValidator.notEquals(
    "domain display is refreshed",
    updated.link!.domain_display,
    link.domain_display,
  );
  TestValidator.predicate(
    "domain display is non-empty",
    updated.link !== null && updated.link.domain_display.length > 0,
  );
  TestValidator.equals("text content remains null", updated.textContent, null);
  TestValidator.equals("image content remains null", updated.postImage, null);
  TestValidator.equals(
    "link summary title follows updated title",
    updated.link!.post.title,
    updatedTitle,
  );
}
