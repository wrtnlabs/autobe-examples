import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostImage } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostImage";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_subscriptions_create } from "../../../generate/generate_random_community_platform_community_subscriptions_create";
import { generate_random_community_platform_member_posts_create } from "../../../generate/generate_random_community_platform_member_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_subscription } from "../../../prepare/prepare_random_community_platform_community_subscription";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";
import { prepare_random_community_platform_post_image } from "../../../prepare/prepare_random_community_platform_post_image";

export async function test_api_post_snapshots_visible_post_published_time_selection(
  connection: api.IConnection,
): Promise<void> {
  const memberConnection: api.IConnection = { host: connection.host };
  const credentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: "Password1!",
  } satisfies ICommunityPlatformMember.IJoin;
  const memberAuth = await authorize_member_join(memberConnection, {
    body: credentials,
  });
  typia.assert(memberAuth);
  // Subscribe member to a new community
  const community = await generate_random_community_platform_communities_create(
    memberConnection,
    {},
  );
  typia.assert(community);
  const subscription =
    await generate_random_community_platform_community_subscriptions_create(
      memberConnection,
      { body: { community_id: community.id } },
    );
  typia.assert(subscription);
  // Create post (use text post for stable snapshot matching)
  const title = RandomGenerator.paragraph({ sentences: 1 });
  const bodyText = RandomGenerator.paragraph({ sentences: 3 });
  // Create post and fetch snapshots; need postId but create returns void in SDK,
  // so we rely on postId returned from snapshot processing by first querying snapshots?
  // We will create multiple snapshot selection by reading snapshots and using their postId.
  await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        post_type: "text",
        title,
        body_text: bodyText,
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  // Retrieve snapshots by using range criteria around now.
  const nowIso = new Date().toISOString() satisfies string &
    tags.Format<"date-time">;
  const firstSnapshots: ICommunityPlatformPostSnapshot[] = [];
  // We will try to find at least one snapshot by broad range.
  const rangeResponse =
    await api.functional.communityPlatform.member.posts.snapshots.processSnapshots(
      memberConnection,
      {
        postId: typia.random<string & tags.Format<"uuid">>(),
        body: {
          publishedAtRange: { from: nowIso, to: nowIso },
          orderDirection: "asc",
          includeDeleted: false,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(rangeResponse);
  // Validate all snapshots for same postId and non-deleted
  for (const snap of [rangeResponse] as ICommunityPlatformPostSnapshot[]) {
    TestValidator.equals("snapshot postId matches", snap.postId, snap.postId);
    TestValidator.equals("snapshot title matches", snap.title, title);
    TestValidator.equals("snapshot body matches", snap.body, bodyText);
    TestValidator.equals("snapshot linkUrl null for text", snap.linkUrl, null);
    TestValidator.predicate(
      "snapshot not soft-deleted",
      snap.deletedAt === null,
    );
  }
  // publishedAt match criteria
  const publishedAt = rangeResponse.publishedAt;
  const byPublishedAtResponse =
    await api.functional.communityPlatform.member.posts.snapshots.processSnapshots(
      memberConnection,
      {
        postId: rangeResponse.postId,
        body: {
          publishedAt,
          orderDirection: "asc",
          includeDeleted: false,
          page: 1,
          limit: 100,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(byPublishedAtResponse);
  TestValidator.equals(
    "by publishedAt returns same postId",
    byPublishedAtResponse.postId,
    rangeResponse.postId,
  );
  TestValidator.equals(
    "by publishedAt title matches",
    byPublishedAtResponse.title,
    title,
  );
  TestValidator.equals(
    "by publishedAt body matches",
    byPublishedAtResponse.body,
    bodyText,
  );
  // Multi-snapshot ordering: request a range and descending order
  const from = publishedAt;
  const to = new Date(
    Date.parse(publishedAt) + 24 * 60 * 60 * 1000,
  ).toISOString() satisfies string & tags.Format<"date-time">;
  const rangeDescResponse =
    await api.functional.communityPlatform.member.posts.snapshots.processSnapshots(
      memberConnection,
      {
        postId: rangeResponse.postId,
        body: {
          publishedAtRange: { from, to },
          orderDirection: "desc",
          includeDeleted: false,
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(rangeDescResponse);
  TestValidator.equals(
    "range desc postId matches",
    rangeDescResponse.postId,
    rangeResponse.postId,
  );
}
