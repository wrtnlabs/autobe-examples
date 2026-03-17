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

export async function test_api_post_text_update_by_non_author_rejected(
  connection: api.IConnection,
): Promise<void> {
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerAuth = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(ownerAuth);
  const community =
    await generate_random_community_platform_member_communities_create(
      ownerConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const originalTitle = RandomGenerator.paragraph({ sentences: 3 });
  const post = await generate_random_community_platform_member_posts_create(
    ownerConnection,
    {
      body: {
        title: originalTitle,
        community_platform_community_id: community.id,
        post_type: "text",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const text =
    await generate_random_community_platform_member_posts_texts_create(
      ownerConnection,
      {
        params: {
          postId: post.id,
        },
        body: {
          body: originalBody,
        },
      },
    );
  typia.assert(text);
  const originalAuthorId = post.author.id;
  const originalCommunityId = post.community.id;
  const originalPostId = post.id;
  const originalTextId = text.id;
  const originalTextPostId = text.post.id;
  TestValidator.equals(
    "text belongs to created post",
    originalTextPostId,
    originalPostId,
  );
  TestValidator.equals(
    "post author remains owner at creation",
    post.author.id,
    ownerAuth.id,
  );
  TestValidator.equals(
    "post community remains created community at creation",
    post.community.id,
    community.id,
  );
  TestValidator.equals(
    "post title initialized as expected",
    post.title,
    originalTitle,
  );
  TestValidator.equals(
    "text body initialized as expected",
    text.body,
    originalBody,
  );
  const attackerConnection: api.IConnection = { host: connection.host };
  const attackerAuth = await authorize_member_join(attackerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(attackerAuth);
  TestValidator.notEquals(
    "attacker must differ from owner",
    attackerAuth.id,
    ownerAuth.id,
  );
  const forbiddenTitle = RandomGenerator.paragraph({ sentences: 4 });
  const forbiddenBody = RandomGenerator.content({ paragraphs: 3 });
  await TestValidator.error(
    "non-author cannot update another member text post",
    async () => {
      await api.functional.communityPlatform.member.posts.texts.update(
        attackerConnection,
        {
          postId: post.id,
          textId: text.id,
          body: {
            title: forbiddenTitle,
            body: forbiddenBody,
          } satisfies ICommunityPlatformPost.IUpdate,
        },
      );
    },
  );
  TestValidator.notEquals(
    "forbidden title differs from original title",
    forbiddenTitle,
    originalTitle,
  );
  TestValidator.notEquals(
    "forbidden body differs from original body",
    forbiddenBody,
    originalBody,
  );
  TestValidator.equals(
    "target post identity remains the same",
    post.id,
    originalPostId,
  );
  TestValidator.equals(
    "target text identity remains the same",
    text.id,
    originalTextId,
  );
  TestValidator.equals(
    "text still references original post identity",
    text.post.id,
    originalPostId,
  );
  TestValidator.equals(
    "author relationship remains unchanged",
    post.author.id,
    originalAuthorId,
  );
  TestValidator.equals(
    "community relationship remains unchanged",
    post.community.id,
    originalCommunityId,
  );
  TestValidator.equals(
    "original title variable remains unchanged after rejection",
    originalTitle,
    post.title,
  );
  TestValidator.equals(
    "original body variable remains unchanged after rejection",
    originalBody,
    text.body,
  );
}
