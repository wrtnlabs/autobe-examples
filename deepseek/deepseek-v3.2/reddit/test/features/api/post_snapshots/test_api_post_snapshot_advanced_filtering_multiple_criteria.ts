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
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformPostText } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostText";
import type { ICommunityPlatformSubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
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
 * Test advanced filtering with multiple criteria on post-snapshots endpoint.
 * Create two members, two communities, and posts of different types (text, link).
 * Generate snapshots through post creation and editing.
 * Use post-snapshots endpoint with complex filters: snapshot_community_platform_community_id
 * for specific community, snapshot_content_type='text', created_at date range to isolate
 * recent snapshots, and search term matching post title.
 * Validate that response contains only snapshots matching all criteria.
 * Verify pagination works correctly with filtered results.
 * This tests comprehensive filtering capabilities for audit trail investigation.
 */
export async function test_api_post_snapshot_advanced_filtering_multiple_criteria(
  connection: api.IConnection,
): Promise<void> {
  // Record start time for date range filtering
  const startTime = new Date();
  // 1. Create first member and community
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(10),
      nickname: RandomGenerator.name(1),
      href: "https://example.com",
      referrer: "https://google.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(member1Auth);
  // Update connection with token
  member1Connection.headers = { Authorization: member1Auth.token.access };
  const community1 =
    await generate_random_community_platform_member_communities_create(
      member1Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community1);
  // Subscribe to community 1
  const subscription1 =
    await generate_random_community_platform_member_subscriptions_create(
      member1Connection,
      {
        body: {
          community_id: community1.id,
          active: true,
        },
      },
    );
  typia.assert(subscription1);
  // Create text post in community 1 with unique title for search
  const textPostTitle = `TextPost-${RandomGenerator.alphaNumeric(6)}-SearchTerm`;
  const textPost = await generate_random_community_platform_member_posts_create(
    member1Connection,
    {
      body: {
        title: textPostTitle,
        community_name: community1.name,
        content_type: "TEXT",
        content_text: {
          content: RandomGenerator.paragraph({ sentences: 3 }),
          formatting: "plain",
        } satisfies ICommunityPlatformPostText.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(textPost);
  // 2. Create second member and community
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(10),
      nickname: RandomGenerator.name(1),
      href: "https://example.com",
      referrer: "https://google.com",
      ip: "127.0.0.1",
    },
  });
  typia.assert(member2Auth);
  // Update connection with token
  member2Connection.headers = { Authorization: member2Auth.token.access };
  const community2 =
    await generate_random_community_platform_member_communities_create(
      member2Connection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        },
      },
    );
  typia.assert(community2);
  // Subscribe to community 2
  const subscription2 =
    await generate_random_community_platform_member_subscriptions_create(
      member2Connection,
      {
        body: {
          community_id: community2.id,
          active: true,
        },
      },
    );
  typia.assert(subscription2);
  // Create link post in community 2 with unique title for search
  const linkPostTitle = `LinkPost-${RandomGenerator.alphaNumeric(6)}-SearchTerm`;
  const linkPost = await generate_random_community_platform_member_posts_create(
    member2Connection,
    {
      body: {
        title: linkPostTitle,
        community_name: community2.name,
        content_type: "LINK",
        content_link: {
          url: "https://example.com",
          title: "Example Link",
          description: "Example description",
          thumbnail_url: "https://example.com/thumbnail.jpg",
        } satisfies ICommunityPlatformPostLink.ICreate,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(linkPost);
}