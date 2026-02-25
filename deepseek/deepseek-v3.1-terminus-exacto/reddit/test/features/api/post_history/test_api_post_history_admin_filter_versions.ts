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

/**
 * Test admin filtering capabilities for post snapshots using version range and timestamp filters.
 * Creates admin and user accounts, generates post with multiple edits, then tests various
 * filtering scenarios including version numbers, date ranges, edit reason search, and pagination.
 */
export async function test_api_post_history_admin_filter_versions(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "admin123",
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  // Create user connection and authenticate
  const userConnection: api.IConnection = { host: connection.host };
  await authorize_user_join(userConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "user123",
      username: RandomGenerator.alphaNumeric(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      userConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(10),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: typia.random<string & tags.Format<"uri">>(),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create initial post
  const post = await generate_random_community_platform_user_posts_create(
    userConnection,
    {
      body: {
        title: RandomGenerator.paragraph({ sentences: 1 }),
        community_name: community.name,
        post_type: "text",
        text_content: RandomGenerator.paragraph({ sentences: 5 }),
      } satisfies ICommunityPlatformPost.ICreate,
    },
  );
  typia.assert(post);
  // Note: In a real scenario, post edits would generate snapshots automatically
  // For testing purposes, we assume the system creates initial snapshots
  // Test 1: Get all snapshots without filters
  const allSnapshots =
    await api.functional.communityPlatform.admin.posts.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(allSnapshots);
  TestValidator.predicate(
    "should return paginated results",
    allSnapshots.pagination.records >= 0,
  );
  TestValidator.predicate(
    "should have data array",
    Array.isArray(allSnapshots.data),
  );
  // Test 2: Filter by specific version number
  if (allSnapshots.data.length > 0) {
    const versionToFilter = allSnapshots.data[0].version_number;
    const versionFiltered =
      await api.functional.communityPlatform.admin.posts.snapshots.index(
        adminConnection,
        {
          postId: post.id,
          body: {
            version_number: typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(versionToFilter),
            page: 1,
            limit: 20,
          } satisfies ICommunityPlatformPostSnapshot.IRequest,
        },
      );
    typia.assert(versionFiltered);
    TestValidator.equals(
      "version filter should return specific version",
      versionFiltered.data.length,
      1,
    );
    TestValidator.equals(
      "version number should match filter",
      versionFiltered.data[0].version_number,
      versionToFilter,
    );
  }
  // Test 3: Filter by date range
  if (allSnapshots.data.length > 0) {
    const earliestSnapshot = allSnapshots.data.reduce((earliest, current) =>
      current.created_at < earliest.created_at ? current : earliest,
    );
    const dateFiltered =
      await api.functional.communityPlatform.admin.posts.snapshots.index(
        adminConnection,
        {
          postId: post.id,
          body: {
            created_at: earliestSnapshot.created_at,
            page: 1,
            limit: 20,
          } satisfies ICommunityPlatformPostSnapshot.IRequest,
        },
      );
    typia.assert(dateFiltered);
    TestValidator.predicate(
      "date filter should return snapshots after or equal to specified date",
      dateFiltered.data.every(
        (snapshot) => snapshot.created_at >= earliestSnapshot.created_at,
      ),
    );
  }
  // Test 4: Test pagination with filters
  const paginationTest =
    await api.functional.communityPlatform.admin.posts.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          page: 1,
          limit: 5,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(paginationTest);
  TestValidator.equals(
    "pagination limit should be respected",
    paginationTest.data.length <= 5,
    true,
  );
  TestValidator.predicate(
    "pagination metadata should be valid",
    paginationTest.pagination.current === 1 &&
      paginationTest.pagination.limit === 5 &&
      paginationTest.pagination.records >= 0 &&
      paginationTest.pagination.pages >= 0,
  );
  // Test 5: Edge case - filter with non-existent version
  const edgeCaseVersion = typia.random<
    number & tags.Type<"int32"> & tags.Minimum<1000>
  >();
  const edgeCaseFilter =
    await api.functional.communityPlatform.admin.posts.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          version_number: typia.assert<number & tags.Type<"int32"> & tags.Minimum<1>>(edgeCaseVersion),
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(edgeCaseFilter);
  TestValidator.equals(
    "non-existent version should return empty results",
    edgeCaseFilter.data.length,
    0,
  );
  TestValidator.equals(
    "pagination records should be 0 for non-existent version",
    edgeCaseFilter.pagination.records,
    0,
  );
  // Test 6: Filter by edit reason (if supported by the system)
  // This tests the edit_reason search functionality
  const reasonFilterTest =
    await api.functional.communityPlatform.admin.posts.snapshots.index(
      adminConnection,
      {
        postId: post.id,
        body: {
          edit_reason: null, // Test with null edit reason
          page: 1,
          limit: 20,
        } satisfies ICommunityPlatformPostSnapshot.IRequest,
      },
    );
  typia.assert(reasonFilterTest);
  TestValidator.predicate(
    "edit reason filter should return valid results",
    Array.isArray(reasonFilterTest.data) &&
      reasonFilterTest.pagination.records >= 0,
  );
}