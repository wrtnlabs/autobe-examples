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

export async function test_api_post_text_update_with_mismatched_text_record_rejected(
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
          slug: `community-${RandomGenerator.alphaNumeric(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.content({ paragraphs: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const firstPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "text",
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(firstPost);
  const firstText =
    await generate_random_community_platform_member_posts_texts_create(
      memberConnection,
      {
        params: {
          postId: firstPost.id,
        },
        body: {
          body: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies ICommunityPlatformPostText.ICreate,
      },
    );
  typia.assert(firstText);
  const secondPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 3 }),
          community_platform_community_id: community.id,
          post_type: "text",
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
  typia.assert(secondPost);
  const secondText =
    await generate_random_community_platform_member_posts_texts_create(
      memberConnection,
      {
        params: {
          postId: secondPost.id,
        },
        body: {
          body: RandomGenerator.content({ paragraphs: 3 }),
        } satisfies ICommunityPlatformPostText.ICreate,
      },
    );
  typia.assert(secondText);
  const originalFirstPostTitle = firstPost.title;
  const originalFirstTextBody = firstText.body;
  const originalSecondPostTitle = secondPost.title;
  const originalSecondTextBody = secondText.body;
  await TestValidator.error(
    "rejects mismatched text record update",
    async () => {
      await api.functional.communityPlatform.member.posts.texts.update(
        memberConnection,
        {
          postId: firstPost.id,
          textId: secondText.id,
          body: {
            title: RandomGenerator.paragraph({ sentences: 4 }),
            body: RandomGenerator.content({ paragraphs: 4 }),
          } satisfies ICommunityPlatformPost.IUpdate,
        },
      );
    },
  );
  TestValidator.equals(
    "first post title remains unchanged in captured state",
    originalFirstPostTitle,
    firstPost.title,
  );
  TestValidator.equals(
    "first text body remains unchanged in captured state",
    originalFirstTextBody,
    firstText.body,
  );
  TestValidator.equals(
    "second post title remains unchanged in captured state",
    originalSecondPostTitle,
    secondPost.title,
  );
  TestValidator.equals(
    "second text body remains unchanged in captured state",
    originalSecondTextBody,
    secondText.body,
  );
}
