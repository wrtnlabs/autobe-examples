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

export async function test_api_post_link_update_rejected_for_mismatched_nested_link(
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
          description: RandomGenerator.paragraph({ sentences: 3 }),
        },
      },
    );
  typia.assert(community);
  const firstPostCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    community_platform_community_id: community.id,
    post_type: "link",
    link: {
      target_url: "https://first-create.example.com/seed",
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const firstPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: firstPostCreateBody,
      },
    );
  typia.assert(firstPost);
  const firstLinkCreateBody = {
    target_url: "https://first-example.com/original-link",
  } satisfies ICommunityPlatformPostLink.ICreate;
  const firstLink =
    await generate_random_community_platform_member_posts_links_create(
      memberConnection,
      {
        params: { postId: firstPost.id },
        body: firstLinkCreateBody,
      },
    );
  typia.assert(firstLink);
  const secondPostCreateBody = {
    title: RandomGenerator.paragraph({ sentences: 3 }),
    community_platform_community_id: community.id,
    post_type: "link",
    link: {
      target_url: "https://second-create.example.com/seed",
    },
  } satisfies ICommunityPlatformPost.ICreate;
  const secondPost =
    await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: secondPostCreateBody,
      },
    );
  typia.assert(secondPost);
  const secondLinkCreateBody = {
    target_url: "https://second-example.com/original-link",
  } satisfies ICommunityPlatformPostLink.ICreate;
  const secondLink =
    await generate_random_community_platform_member_posts_links_create(
      memberConnection,
      {
        params: { postId: secondPost.id },
        body: secondLinkCreateBody,
      },
    );
  typia.assert(secondLink);
  const firstPostOriginalTitle = firstPost.title;
  const secondPostOriginalTitle = secondPost.title;
  const firstLinkOriginalTargetUrl = firstLink.target_url;
  const secondLinkOriginalTargetUrl = secondLink.target_url;
  const firstLinkOriginalDomainDisplay = firstLink.domain_display;
  const secondLinkOriginalDomainDisplay = secondLink.domain_display;
  const attemptedTitle = RandomGenerator.paragraph({ sentences: 4 });
  const attemptedTargetUrl = "https://mismatched-update.example.com/rejected";
  const updateBody = {
    title: attemptedTitle,
    target_url: attemptedTargetUrl,
  } satisfies ICommunityPlatformPost.IUpdate;
  await TestValidator.error(
    "reject mismatched nested link reference",
    async () => {
      await api.functional.communityPlatform.member.posts.links.update(
        memberConnection,
        {
          postId: firstPost.id,
          linkId: secondLink.id,
          body: updateBody,
        },
      );
    },
  );
  TestValidator.equals(
    "first post title snapshot preserved",
    firstPostOriginalTitle,
    firstPost.title,
  );
  TestValidator.equals(
    "second post title snapshot preserved",
    secondPostOriginalTitle,
    secondPost.title,
  );
  TestValidator.equals(
    "first link target_url snapshot preserved",
    firstLinkOriginalTargetUrl,
    firstLink.target_url,
  );
  TestValidator.equals(
    "second link target_url snapshot preserved",
    secondLinkOriginalTargetUrl,
    secondLink.target_url,
  );
  TestValidator.equals(
    "first link domain_display snapshot preserved",
    firstLinkOriginalDomainDisplay,
    firstLink.domain_display,
  );
  TestValidator.equals(
    "second link domain_display snapshot preserved",
    secondLinkOriginalDomainDisplay,
    secondLink.domain_display,
  );
  TestValidator.notEquals(
    "first post title not replaced by rejected title",
    firstPost.title,
    attemptedTitle,
  );
  TestValidator.notEquals(
    "second post title not replaced by rejected title",
    secondPost.title,
    attemptedTitle,
  );
  TestValidator.notEquals(
    "first link target_url not replaced by rejected url",
    firstLink.target_url,
    attemptedTargetUrl,
  );
  TestValidator.notEquals(
    "second link target_url not replaced by rejected url",
    secondLink.target_url,
    attemptedTargetUrl,
  );
  TestValidator.notEquals(
    "first and second link target URLs remain distinct",
    firstLink.target_url,
    secondLink.target_url,
  );
  TestValidator.notEquals(
    "first and second link domain displays remain distinct",
    firstLink.domain_display,
    secondLink.domain_display,
  );
}
