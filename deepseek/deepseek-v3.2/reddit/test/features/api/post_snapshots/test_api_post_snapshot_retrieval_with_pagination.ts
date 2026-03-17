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
 * Test retrieving historical post snapshots with pagination and sorting.
 * 1. Create member account and authenticate
 * 2. Create community and subscribe to it
 * 3. Create multiple text posts to generate snapshots
 * 4. Query post-snapshots endpoint with pagination
 * 5. Validate pagination metadata and snapshot summaries
 */
export async function test_api_post_snapshot_retrieval_with_pagination(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: typia.random<string & tags.Format<"password">>(),
      username: RandomGenerator.alphaNumeric(12),
      nickname: RandomGenerator.name(1),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member);
  // 2. Create community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10).toLowerCase(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Subscribe to community (required for post creation)
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
  // 4. Create multiple text posts to generate snapshots
  const posts: ICommunityPlatformPost[] = [];
  for (let i = 0; i < 3; i++) {
    const post = await generate_random_community_platform_member_posts_create(
      memberConnection,
      {
        body: {
          title: RandomGenerator.paragraph({ sentences: 1 }),
          community_name: community.name,
          content_type: "TEXT" as const,
          content_text: {
            content: RandomGenerator.content({
              paragraphs: 1,
              sentenceMin: 2,
              sentenceMax: 4,
            }),
            formatting: "plain",
          } satisfies ICommunityPlatformPostText.ICreate,
        } satisfies ICommunityPlatformPost.ICreate,
      },
    );
    typia.assert(post);
    posts.push(post);
  }
  // 5. Query post-snapshots with pagination
  const snapshotRequest: ICommunityPlatformPostSnapshot.IRequest = {
    page: 1 satisfies number & tags.Type<"int32"> & tags.Minimum<1>,
    limit: 10 satisfies number &
      tags.Type<"int32"> &
      tags.Minimum<1> &
      tags.Maximum<100>,
    sort: "created_at.desc",
  };
  const snapshots = await api.functional.communityPlatform.post_snapshots.index(
    connection, // No authorization required per endpoint spec
    {
      body: snapshotRequest,
    },
  );
  typia.assert(snapshots);
  // 6. Validate pagination metadata
  TestValidator.equals(
    "pagination current page",
    snapshots.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", snapshots.pagination.limit, 10);
  TestValidator.predicate(
    "records should be at least number of posts created",
    snapshots.pagination.records >= posts.length,
  );
  TestValidator.predicate(
    "pages should be at least 1",
    snapshots.pagination.pages >= 1,
  );
  // 7. Validate snapshot summaries structure
  TestValidator.predicate(
    "snapshots data is array",
    Array.isArray(snapshots.data),
  );
  if (snapshots.data.length > 0) {
    // Validate each snapshot - typia.assert already validates all types
    for (const snapshot of snapshots.data) {
      typia.assert(snapshot);
      // Business logic validation: snapshot title should match post title
      // We can't directly match because we don't know which snapshot corresponds to which post
      // But we can validate basic business requirements
      TestValidator.predicate(
        `snapshot ${snapshot.id} has non-empty title`,
        snapshot.snapshot_title.length > 0,
      );
      // Validate author and community exist (already done by typia.assert)
      typia.assert(snapshot.author);
      typia.assert(snapshot.community);
    }
    // Validate ordering (most recent first)
    if (snapshots.data.length > 1) {
      for (let i = 0; i < snapshots.data.length - 1; i++) {
        const current = new Date(
          snapshots.data[i].snapshot_created_at,
        ).getTime();
        const next = new Date(
          snapshots.data[i + 1].snapshot_created_at,
        ).getTime();
        TestValidator.predicate(
          `snapshots ordered descending at position ${i}`,
          current >= next,
        );
      }
    }
  }
}
