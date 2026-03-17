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

export async function test_api_post_update_by_non_author_rejected(
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
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  const originalTitle = RandomGenerator.paragraph({ sentences: 4 });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const post = await generate_random_community_platform_member_posts_create(
    authorConnection,
    {
      body: {
        title: originalTitle,
        community_platform_community_id: community.id,
        post_type: "text",
        textContent: {
          body: originalBody,
        },
      },
    },
  );
  typia.assert(post);
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
  const maliciousTitle = RandomGenerator.paragraph({ sentences: 5 });
  const maliciousBody = RandomGenerator.content({ paragraphs: 3 });
  const updateBody = {
    title: maliciousTitle,
    body: maliciousBody,
  } satisfies ICommunityPlatformPost.IUpdate;
  await TestValidator.httpError(
    "non-author cannot update another member's post",
    403,
    async () => {
      await api.functional.communityPlatform.member.posts.update(
        attackerConnection,
        {
          postId: post.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.notEquals(
    "attacker is distinct from the original author",
    attackerAuth.id,
    authorAuth.id,
  );
  TestValidator.equals(
    "created post snapshot retains original author",
    post.author.id,
    authorAuth.id,
  );
  TestValidator.equals(
    "created post snapshot retains original title",
    post.title,
    originalTitle,
  );
  TestValidator.notEquals(
    "forbidden update tried a different title",
    maliciousTitle,
    post.title,
  );
  TestValidator.equals(
    "created post snapshot retains original community",
    post.community.id,
    community.id,
  );
  TestValidator.predicate(
    "created post snapshot is a text variant",
    post.post_type === "text",
  );
  TestValidator.predicate(
    "created post snapshot retains original text body",
    post.textContent !== null && post.textContent.body === originalBody,
  );
  TestValidator.predicate(
    "forbidden update tried a different text body",
    maliciousBody !== originalBody,
  );
}
