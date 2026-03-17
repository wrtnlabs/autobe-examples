import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformFile";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostAttachment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostAttachment";
import type { ICommunityPlatformPostLink } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostLink";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
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
import { generate_random_community_platform_member_subscriptions_create } from "../../../generate/generate_random_community_platform_member_subscriptions_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_attachment } from "../../../prepare/prepare_random_community_platform_post_attachment";
import { prepare_random_community_platform_post_link } from "../../../prepare/prepare_random_community_platform_post_link";
import { prepare_random_community_platform_post_text } from "../../../prepare/prepare_random_community_platform_post_text";
import { prepare_random_community_platform_subscription } from "../../../prepare/prepare_random_community_platform_subscription";

/**
 * Test that an authenticated member can successfully create a link post in a subscribed community.
 * This tests link post creation with URL and metadata extraction.
 */
export async function test_api_post_creation_link_with_domain_extraction(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {});
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {},
    );
  typia.assert(community);
  // 3. Subscribe to community
  const subscription =
    await generate_random_community_platform_member_subscriptions_create(
      memberConnection,
      {
        body: {
          community_id: community.id,
          active: true,
        } satisfies ICommunityPlatformSubscription.ICreate,
      },
    );
  typia.assert(subscription);
  // 4. Create link post
  const url = "https://example.com/page" satisfies string & tags.Format<"url">;
  const linkPostBody = {
    title: RandomGenerator.paragraph({ sentences: 2 }),
    community_name: community.name,
    content_type: "LINK" satisfies "LINK",
    content_link: {
      url: url,
      title: RandomGenerator.paragraph({ sentences: 1 }),
      description: RandomGenerator.paragraph({ sentences: 3 }),
      thumbnail_url: "https://example.com/image.jpg" satisfies string &
        tags.Format<"url">,
    } satisfies ICommunityPlatformPostLink.ICreate,
  } satisfies ICommunityPlatformPost.ICreate;
  const post = await api.functional.communityPlatform.member.posts.create(
    memberConnection,
    {
      body: linkPostBody,
    },
  );
  typia.assert(post);
  // Validate response
  TestValidator.equals(
    "content_type should be LINK",
    post.content_type,
    "LINK",
  );
  TestValidator.predicate(
    "content should be ICommunityPlatformPostLink",
    () => {
      // Use typia.assertGuard to narrow the type
      typia.assertGuard<ICommunityPlatformPostLink>(post.content!);
      return true;
    },
  );
  // Extract domain from URL and validate
  const domain = new URL(url).hostname;
  const linkContent = post.content as ICommunityPlatformPostLink;
  TestValidator.equals("URL should match", linkContent.url, url);
  TestValidator.equals(
    "domain should be extracted",
    linkContent.domain,
    domain,
  );
  // Validate post metadata
  TestValidator.equals(
    "community name should match",
    post.community.name,
    community.name,
  );
  TestValidator.equals("author should be member", post.author.id, member.id);
  TestValidator.predicate(
    "vote_score should be initialized to 0",
    post.vote_score === 0,
  );
  TestValidator.predicate(
    "comment_count should be initialized to 0",
    post.comment_count === 0,
  );
}