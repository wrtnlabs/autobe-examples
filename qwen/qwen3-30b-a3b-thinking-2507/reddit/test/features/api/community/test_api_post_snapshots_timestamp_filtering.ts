import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunitySubscription";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_snapshots_timestamp_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a member
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_join(memberConnection, {
    body: {},
  });
  // 2. Create a new community
  const community =
    await generate_random_community_platform_member_communities_create(
      memberConnection,
      {
        body: {},
      },
    );
  // 3. Subscribe to the community
  await api.functional.communityPlatform.member.communities.subscriptions.create(
    memberConnection,
    {
      communityId: community.id,
    },
  );
  // 4. Create two example posts to generate snapshots
  const post1 = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        content_type: "text",
        title: "2023 post",
      },
    },
  );
  const post2 = await generate_random_community_platform_member_posts_create(
    memberConnection,
    {
      body: {
        community_id: community.id,
        content_type: "text",
        title: "2024 post",
      },
    },
  );
  // 5. Request with date range covering 2024
  const response2024 =
    await api.functional.communityPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post2.id,
        body: {
          from: "2024-01-01T00:00:00Z",
          to: "2024-12-31T23:59:59Z",
        },
      },
    );
  typia.assert(response2024);
  // 6. Validate response for 2024
  TestValidator.equals(
    "Should contain snapshot for 2024 post",
    response2024.data.length,
    1,
  );
  // 7. Request with date range for 2023
  const response2023 =
    await api.functional.communityPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post1.id,
        body: {
          from: "2023-01-01T00:00:00Z",
          to: "2023-12-31T23:59:59Z",
        },
      },
    );
  typia.assert(response2023);
  // 8. Validate response for 2023
  TestValidator.equals(
    "Should contain snapshot for 2023 post",
    response2023.data.length,
    1,
  );
  // 9. Request outside 2024 (2025)
  const response2025 =
    await api.functional.communityPlatform.posts.snapshots.index(
      memberConnection,
      {
        postId: post2.id,
        body: {
          from: "2025-01-01T00:00:00Z",
          to: "2025-12-31T23:59:59Z",
        },
      },
    );
  // 10. Validate response for 2025 is empty
  TestValidator.equals(
    "Should contain no snapshots for 2025",
    response2025.data.length,
    0,
  );
}
