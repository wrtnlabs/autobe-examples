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

export async function test_api_post_text_delete_by_author(
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
    },
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 5 }),
        },
      },
    );
  typia.assert(community);
  const targetPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "text",
        },
      },
    );
  typia.assert(targetPost);
  const targetBody = RandomGenerator.content({ paragraphs: 2 });
  const targetText =
    await generate_random_community_platform_member_posts_texts_create(
      memberConnection,
      {
        params: {
          postId: targetPost.id,
        },
        body: {
          body: targetBody,
        },
      },
    );
  typia.assert(targetText);
  const unaffectedPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "text",
        },
      },
    );
  typia.assert(unaffectedPost);
  const unaffectedBody = RandomGenerator.content({ paragraphs: 2 });
  const unaffectedText =
    await generate_random_community_platform_member_posts_texts_create(
      memberConnection,
      {
        params: {
          postId: unaffectedPost.id,
        },
        body: {
          body: unaffectedBody,
        },
      },
    );
  typia.assert(unaffectedText);
  TestValidator.equals(
    "target post belongs to created community",
    targetPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "unaffected post belongs to created community",
    unaffectedPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "target text belongs to target post",
    targetText.post.id,
    targetPost.id,
  );
  TestValidator.equals("target text body matches", targetText.body, targetBody);
  TestValidator.equals(
    "unaffected text belongs to unaffected post",
    unaffectedText.post.id,
    unaffectedPost.id,
  );
  TestValidator.equals(
    "unaffected text body matches",
    unaffectedText.body,
    unaffectedBody,
  );
  TestValidator.notEquals(
    "target and unaffected posts differ",
    targetPost.id,
    unaffectedPost.id,
  );
  TestValidator.notEquals(
    "target and unaffected texts differ",
    targetText.id,
    unaffectedText.id,
  );
  const deletePostId = targetPost.id;
  const deleteTextId = targetText.id;
  TestValidator.notEquals(
    "delete post id differs from unaffected post id",
    deletePostId,
    unaffectedPost.id,
  );
  TestValidator.notEquals(
    "delete text id differs from unaffected text id",
    deleteTextId,
    unaffectedText.id,
  );
  await api.functional.communityPlatform.member.posts.texts.erase(
    memberConnection,
    {
      postId: deletePostId,
      textId: deleteTextId,
    },
  );
  TestValidator.equals(
    "delete command targeted created post",
    deletePostId,
    targetPost.id,
  );
  TestValidator.equals(
    "delete command targeted created text",
    deleteTextId,
    targetText.id,
  );
  TestValidator.equals(
    "unaffected text still references unaffected post in local state",
    unaffectedText.post.id,
    unaffectedPost.id,
  );
  TestValidator.notEquals(
    "deleted target text id differs from unaffected text id",
    deleteTextId,
    unaffectedText.id,
  );
  TestValidator.notEquals(
    "deleted target post id differs from unaffected post id",
    deletePostId,
    unaffectedPost.id,
  );
}
