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

export async function test_api_post_link_creation_for_author_owned_link_post(
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
          title: RandomGenerator.name(3),
          description: RandomGenerator.paragraph({ sentences: 6 }),
        },
      },
    );
  typia.assert(community);
  const parentPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 4 }),
          community_platform_community_id: community.id,
          post_type: "link",
        },
      },
    );
  typia.assert(parentPost);
  const linkBody = {
    target_url: "https://example.com/articles/canonical-link-target",
  } satisfies ICommunityPlatformPostLink.ICreate;
  const createdLink =
    await generate_random_community_platform_member_posts_links_create(
      memberConnection,
      {
        params: {
          postId: parentPost.id,
        },
        body: linkBody,
      },
    );
  typia.assert(createdLink);
  TestValidator.notEquals(
    "link subtype has its own id",
    createdLink.id,
    parentPost.id,
  );
  TestValidator.equals(
    "target url echoes input",
    createdLink.target_url,
    linkBody.target_url,
  );
  TestValidator.predicate(
    "domain display is present for feed presentation",
    createdLink.domain_display.length > 0,
  );
  TestValidator.equals(
    "link belongs to parent post",
    createdLink.post.id,
    parentPost.id,
  );
  TestValidator.equals(
    "parent post title unchanged",
    createdLink.post.title,
    parentPost.title,
  );
  TestValidator.equals(
    "parent post type unchanged",
    createdLink.post.post_type,
    parentPost.post_type,
  );
  TestValidator.equals(
    "parent post status unchanged",
    createdLink.post.status,
    parentPost.status,
  );
  TestValidator.equals(
    "parent post vote count unchanged",
    createdLink.post.vote_count,
    parentPost.voteScore,
  );
  TestValidator.equals(
    "parent post comment count unchanged",
    createdLink.post.comment_count,
    parentPost.commentCount,
  );
  TestValidator.equals(
    "parent post created_at unchanged",
    createdLink.post.created_at,
    parentPost.created_at,
  );
  TestValidator.equals(
    "parent post updated_at unchanged",
    createdLink.post.updated_at,
    parentPost.updated_at,
  );
  TestValidator.equals(
    "parent post deleted_at unchanged",
    createdLink.post.deleted_at,
    parentPost.deleted_at,
  );
  TestValidator.equals(
    "parent author id unchanged",
    createdLink.post.author.id,
    parentPost.author.id,
  );
  TestValidator.equals(
    "parent author code unchanged",
    createdLink.post.author.code,
    parentPost.author.code,
  );
  TestValidator.equals(
    "parent author email unchanged",
    createdLink.post.author.email,
    parentPost.author.email,
  );
  TestValidator.equals(
    "parent author email verification unchanged",
    createdLink.post.author.email_verified,
    parentPost.author.email_verified,
  );
  TestValidator.equals(
    "parent author status unchanged",
    createdLink.post.author.status,
    parentPost.author.status,
  );
  TestValidator.equals(
    "parent author last sign in unchanged",
    createdLink.post.author.last_signed_in_at,
    parentPost.author.last_signed_in_at,
  );
  TestValidator.equals(
    "parent author created_at unchanged",
    createdLink.post.author.created_at,
    parentPost.author.created_at,
  );
  TestValidator.equals(
    "parent author updated_at unchanged",
    createdLink.post.author.updated_at,
    parentPost.author.updated_at,
  );
  TestValidator.equals(
    "parent author deleted_at unchanged",
    createdLink.post.author.deleted_at,
    parentPost.author.deleted_at,
  );
  TestValidator.equals(
    "parent community id unchanged",
    createdLink.post.community.id,
    community.id,
  );
  TestValidator.equals(
    "parent community slug unchanged",
    createdLink.post.community.slug,
    parentPost.community.slug,
  );
  TestValidator.equals(
    "parent community title unchanged",
    createdLink.post.community.title,
    parentPost.community.title,
  );
  TestValidator.equals(
    "parent community description unchanged",
    createdLink.post.community.description,
    parentPost.community.description,
  );
  TestValidator.equals(
    "parent community status unchanged",
    createdLink.post.community.status,
    parentPost.community.status,
  );
  TestValidator.equals(
    "parent community subscriber count unchanged",
    createdLink.post.community.subscriber_count,
    parentPost.community.subscriber_count,
  );
  TestValidator.equals(
    "parent community created_at unchanged",
    createdLink.post.community.created_at,
    parentPost.community.created_at,
  );
  TestValidator.equals(
    "parent community updated_at unchanged",
    createdLink.post.community.updated_at,
    parentPost.community.updated_at,
  );
  TestValidator.equals(
    "parent community deleted_at unchanged",
    createdLink.post.community.deleted_at,
    parentPost.community.deleted_at,
  );
  TestValidator.equals(
    "parent community member unchanged",
    createdLink.post.community.member,
    parentPost.community.member,
  );
}
