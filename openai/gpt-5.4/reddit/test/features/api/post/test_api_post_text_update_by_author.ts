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
import { generate_random_community_platform_member_posts_texts_create } from "../../../generate/generate_random_community_platform_member_posts_texts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";

export async function test_api_post_text_update_by_author(
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
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: originalTitle,
        community_platform_community_id: community.id,
        post_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const text =
    await generate_random_community_platform_member_posts_texts_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: originalBody,
        } satisfies ICommunityPlatformPostText.ICreate,
      },
    );
  typia.assert(text);
  const updatedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });
  const updated =
    await api.functional.communityPlatform.member.posts.texts.update(
      memberConnection,
      {
        postId: post.id,
        textId: text.id,
        body: {
          title: updatedTitle,
          body: updatedBody,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updated);
  TestValidator.equals("post id is preserved", updated.id, post.id);
  TestValidator.equals(
    "updated title is reflected",
    updated.title,
    updatedTitle,
  );
  TestValidator.equals(
    "post type is preserved",
    updated.post_type,
    post.post_type,
  );
  TestValidator.equals(
    "author id is preserved",
    updated.author.id,
    post.author.id,
  );
  TestValidator.equals(
    "community id is preserved",
    updated.community.id,
    post.community.id,
  );
  TestValidator.predicate(
    "text content remains present",
    updated.textContent !== null,
  );
  TestValidator.equals(
    "text content id is preserved",
    updated.textContent!.id,
    text.id,
  );
  TestValidator.equals(
    "text content body is updated",
    updated.textContent!.body,
    updatedBody,
  );
  TestValidator.equals(
    "text content belongs to same post",
    updated.textContent!.post.id,
    post.id,
  );
  TestValidator.equals("link remains null", updated.link, null);
  TestValidator.equals("post image remains null", updated.postImage, null);
}
