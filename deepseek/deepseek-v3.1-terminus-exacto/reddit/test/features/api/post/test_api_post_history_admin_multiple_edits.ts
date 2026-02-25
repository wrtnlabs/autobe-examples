import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPostSnapshot";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformPostSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformPostSnapshot";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_posts_create } from "../../../generate/generate_random_community_platform_user_posts_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_post } from "../../../prepare/prepare_random_community_platform_post";

export async function test_api_post_history_admin_multiple_edits(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // 2. User authentication and community creation
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphaNumeric(12),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: null,
    } satisfies ICommunityPlatformUser.IJoin,
  });
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create initial post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({
          sentences: 1,
          wordMin: 3,
          wordMax: 8,
        }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // 4. Test retrieving snapshots for the post
  // Since we cannot create actual edits without an edit endpoint,
  // we test the snapshot retrieval functionality with various filters
  // Test basic snapshot retrieval
  const allSnapshots =
    await api.functional.communityPlatform.admin.posts.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        body: {} satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  // Validate response structure
  TestValidator.predicate(
    "pagination object exists",
    allSnapshots.pagination !== undefined,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(allSnapshots.data),
  );
  // Test pagination functionality
  const paginatedResponse =
    await api.functional.communityPlatform.admin.posts.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(paginatedResponse);
  TestValidator.equals(
    "pagination limit matches",
    paginatedResponse.pagination.limit,
    10,
  );
  TestValidator.equals(
    "pagination page matches",
    paginatedResponse.pagination.current,
    1,
  );
  // Test filtering by creation date (empty result expected since no edits)
  const dateFilterResponse =
    await api.functional.communityPlatform.admin.posts.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          created_at: new Date().toISOString(),
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(dateFilterResponse);
  // Test authorization - ensure user cannot access admin endpoint
  await TestValidator.error(
    "user unauthorized for admin endpoint",
    async () => {
      await api.functional.communityPlatform.admin.posts.snapshots.index(
        userConnection,
        {
          postId: post.id,
          body: {} satisfies ICommunityPlatformPostSnapshot.IRequest,
        },
      );
    },
  );
  // Validate snapshot summary structure when snapshots exist
  if (allSnapshots.data.length > 0) {
    const snapshot = allSnapshots.data[0];
    TestValidator.predicate("snapshot has id", typeof snapshot.id === "string");
    TestValidator.predicate(
      "snapshot has created_at",
      typeof snapshot.created_at === "string",
    );
    TestValidator.predicate(
      "snapshot has version_number",
      typeof snapshot.version_number === "number",
    );
    // Check ordering (newest first)
    const timestamps = allSnapshots.data.map((s) =>
      new Date(s.created_at).getTime(),
    );
    for (let i = 0; i < timestamps.length - 1; i++) {
      TestValidator.predicate(
        "snapshots ordered newest first",
        timestamps[i] >= timestamps[i + 1],
      );
    }
  }
}
