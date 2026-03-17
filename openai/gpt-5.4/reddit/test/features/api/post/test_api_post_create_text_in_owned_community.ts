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

export async function test_api_post_create_text_in_owned_community(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = {
    host: connection.host,
  };
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
          title: RandomGenerator.name(2),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(community);
  const postBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 6,
    sentenceMax: 10,
    wordMin: 3,
    wordMax: 8,
  });
  const postTitle = RandomGenerator.paragraph({
    sentences: 4,
    wordMin: 3,
    wordMax: 8,
  });
  const postInput = {
    title: postTitle,
    community_platform_community_id: community.id,
    post_type: "text",
    textContent: {
      body: postBody,
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: postInput,
    },
  );
  typia.assert(post);
  TestValidator.equals("post title preserved", post.title, postTitle);
  TestValidator.equals(
    "post type preserved",
    post.post_type,
    postInput.post_type,
  );
  TestValidator.equals("text link absent", post.link, null);
  TestValidator.equals("text image absent", post.postImage, null);
  TestValidator.equals("initial vote score", post.voteScore, 0);
  TestValidator.equals("initial comment count", post.commentCount, 0);
  TestValidator.equals("post not deleted", post.deleted_at, null);
  TestValidator.predicate("created_at assigned", post.created_at.length > 0);
  TestValidator.predicate("updated_at assigned", post.updated_at.length > 0);
  TestValidator.predicate("text content exists", post.textContent !== null);
  const textContent = typia.assert(post.textContent!);
  TestValidator.equals("text body preserved", textContent.body, postBody);
}
