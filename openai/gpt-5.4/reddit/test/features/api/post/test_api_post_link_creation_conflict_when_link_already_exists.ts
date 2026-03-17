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

export async function test_api_post_link_creation_conflict_when_link_already_exists(
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
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(authorized);
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          slug: `community-${RandomGenerator.alphabets(8)}`,
          title: RandomGenerator.name(),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  const post = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 4 }),
        community_platform_community_id: community.id,
        post_type: "link",
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  const firstLinkBody = {
    target_url: `https://example.com/${RandomGenerator.alphaNumeric(10)}`,
  } satisfies ICommunityPlatformPostLink.ICreate;
  const firstLink =
    await generate_random_community_platform_member_posts_links_create(
      memberConnection,
      {
        params: {
          postId: post.id,
        },
        body: firstLinkBody,
      },
    );
  typia.assert(firstLink);
  const firstLinkId = firstLink.id;
  TestValidator.equals(
    "first link belongs to the created parent post",
    firstLink.post.id,
    post.id,
  );
  TestValidator.equals(
    "first link preserves original target url",
    firstLink.target_url,
    firstLinkBody.target_url,
  );
  TestValidator.predicate(
    "first link has stable identifier",
    firstLinkId.length > 0,
  );
  const duplicateLinkBody = {
    target_url: `https://example.org/${RandomGenerator.alphaNumeric(10)}`,
  } satisfies ICommunityPlatformPostLink.ICreate;
  await TestValidator.error(
    "duplicate link subtype creation conflicts when link already exists",
    async () => {
      await generate_random_community_platform_member_posts_links_create(
        memberConnection,
        {
          params: {
            postId: post.id,
          },
          body: duplicateLinkBody,
        },
      );
    },
  );
  TestValidator.equals(
    "original link resource id remains unchanged after duplicate attempt",
    firstLink.id,
    firstLinkId,
  );
  TestValidator.equals(
    "original link remains attached to the same parent post after duplicate attempt",
    firstLink.post.id,
    post.id,
  );
  TestValidator.equals(
    "original link target url remains effective after duplicate attempt",
    firstLink.target_url,
    firstLinkBody.target_url,
  );
}
