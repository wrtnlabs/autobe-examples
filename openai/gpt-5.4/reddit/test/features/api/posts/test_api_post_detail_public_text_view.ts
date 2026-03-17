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

export async function test_api_post_detail_public_text_view(
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
  const communityBody = {
    slug: `community-${RandomGenerator.alphabets(8)}`,
    title: RandomGenerator.name(),
    description: RandomGenerator.paragraph({ sentences: 6 }),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: communityBody,
      },
    );
  typia.assert(community);
  const textBody = RandomGenerator.content({
    paragraphs: 2,
    sentenceMin: 8,
    sentenceMax: 12,
    wordMin: 3,
    wordMax: 8,
  });
  const postBody = {
    title: RandomGenerator.paragraph({ sentences: 4 }),
    community_platform_community_id: community.id,
    post_type: "text",
    textContent: {
      body: textBody,
    } satisfies ICommunityPlatformPostText.ICreate,
  } satisfies ICommunityPlatformPost.ICreate;
  const createdPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: postBody,
      },
    );
  typia.assert(createdPost);
  const guestConnection: api.IConnection = { host: connection.host };
  const found = await api.functional.communityPlatform.posts.at(
    guestConnection,
    {
      postId: createdPost.id,
    },
  );
  typia.assert(found);
  TestValidator.equals("post id matches", found.id, createdPost.id);
  TestValidator.equals("post title matches", found.title, createdPost.title);
  TestValidator.equals(
    "post type matches",
    found.post_type,
    createdPost.post_type,
  );
  TestValidator.equals("post status matches", found.status, createdPost.status);
  TestValidator.equals(
    "author summary matches",
    found.author,
    createdPost.author,
  );
  TestValidator.equals(
    "community id matches",
    found.community.id,
    community.id,
  );
  TestValidator.equals(
    "community slug matches",
    found.community.slug,
    community.slug,
  );
  TestValidator.equals(
    "community title matches",
    found.community.title,
    community.title,
  );
  TestValidator.equals(
    "community description matches",
    found.community.description,
    community.description,
  );
  TestValidator.equals(
    "community status matches",
    found.community.status,
    community.status,
  );
  TestValidator.notEquals("text content exists", found.textContent, null);
  TestValidator.equals(
    "text content parent post id matches",
    found.textContent!.post.id,
    found.id,
  );
  TestValidator.equals("text body matches", found.textContent!.body, textBody);
  TestValidator.equals("link absent for text post", found.link, null);
  TestValidator.equals("image absent for text post", found.postImage, null);
  TestValidator.equals("initial vote score", found.voteScore, 0);
  TestValidator.equals("initial comment count", found.commentCount, 0);
}
