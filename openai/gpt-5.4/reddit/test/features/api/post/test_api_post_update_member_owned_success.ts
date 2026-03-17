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

export async function test_api_post_update_member_owned_success(
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
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 2 }),
        },
      },
    );
  typia.assert(community);
  const originalTitle = RandomGenerator.paragraph({ sentences: 4 });
  const originalBody = RandomGenerator.content({ paragraphs: 2 });
  const createdPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
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
  typia.assert(createdPost);
  TestValidator.equals(
    "created post community preserved",
    createdPost.community.id,
    community.id,
  );
  TestValidator.equals(
    "created post author matches member",
    createdPost.author.id,
    authorized.id,
  );
  TestValidator.equals(
    "created post type is text",
    createdPost.post_type,
    "text",
  );
  TestValidator.predicate(
    "created text content exists",
    createdPost.textContent !== null,
  );
  TestValidator.equals(
    "created text body stored",
    createdPost.textContent!.body,
    originalBody,
  );
  TestValidator.equals("created link is null", createdPost.link, null);
  TestValidator.equals(
    "created post image is null",
    createdPost.postImage,
    null,
  );
  const updatedTitle = RandomGenerator.paragraph({ sentences: 5 });
  const updatedBody = RandomGenerator.content({ paragraphs: 3 });
  const updatedPost =
    await api.functional.communityPlatform.member.posts.update(
      memberConnection,
      {
        postId: createdPost.id,
        body: {
          title: updatedTitle,
          body: updatedBody,
        } satisfies ICommunityPlatformPost.IUpdate,
      },
    );
  typia.assert(updatedPost);
  TestValidator.equals("same post id", updatedPost.id, createdPost.id);
  TestValidator.equals(
    "community id preserved",
    updatedPost.community.id,
    createdPost.community.id,
  );
  TestValidator.equals(
    "author id preserved",
    updatedPost.author.id,
    createdPost.author.id,
  );
  TestValidator.equals(
    "post type unchanged",
    updatedPost.post_type,
    createdPost.post_type,
  );
  TestValidator.equals("title updated", updatedPost.title, updatedTitle);
  TestValidator.notEquals(
    "updated_at advanced",
    updatedPost.updated_at,
    createdPost.updated_at,
  );
  TestValidator.predicate(
    "text content exists after update",
    updatedPost.textContent !== null,
  );
  TestValidator.equals(
    "text body updated",
    updatedPost.textContent!.body,
    updatedBody,
  );
  TestValidator.equals(
    "text content linked to updated post",
    updatedPost.textContent!.post.id,
    updatedPost.id,
  );
  TestValidator.equals(
    "text content summary title matches updated title",
    updatedPost.textContent!.post.title,
    updatedPost.title,
  );
  TestValidator.equals(
    "text content summary post type matches",
    updatedPost.textContent!.post.post_type,
    updatedPost.post_type,
  );
  TestValidator.equals(
    "text content summary community preserved",
    updatedPost.textContent!.post.community.id,
    updatedPost.community.id,
  );
  TestValidator.equals(
    "text content summary author preserved",
    updatedPost.textContent!.post.author.id,
    updatedPost.author.id,
  );
  TestValidator.equals("link remains null", updatedPost.link, null);
  TestValidator.equals("post image remains null", updatedPost.postImage, null);
}
