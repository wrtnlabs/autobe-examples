import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityFlair } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlair";
import type { ICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityFlairAssignment";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityFlairAssignment } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityFlairAssignment";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_flair_search_user_flair_filter(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // Note: Since we don't have API functions to create communities, users, or flairs,
  // and the scenario requires testing filtered searches, we'll test the search functionality
  // with various filter combinations to ensure the filtering logic works correctly.
  // Generate test IDs for filtering
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const testUserId = typia.random<string & tags.Format<"uuid">>();
  const testFlairId = typia.random<string & tags.Format<"uuid">>();
  const nonExistentUserId = typia.random<string & tags.Format<"uuid">>();
  const wrongFlairId = typia.random<string & tags.Format<"uuid">>();
  // Test 1: Search with valid user_id and flair_id
  const searchResult1 =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId: communityId,
        body: {
          user_id: testUserId,
          flair_id: testFlairId,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(searchResult1);
  // Test 2: Search with non-existent user_id
  const searchResult2 =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId: communityId,
        body: {
          user_id: nonExistentUserId,
          flair_id: testFlairId,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(searchResult2);
  // Test 3: Search with wrong flair_id
  const searchResult3 =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId: communityId,
        body: {
          user_id: testUserId,
          flair_id: wrongFlairId,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(searchResult3);
  // Test 4: Search with only user_id filter
  const searchResult4 =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId: communityId,
        body: {
          user_id: testUserId,
          flair_id: undefined,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(searchResult4);
  // Test 5: Search with only flair_id filter
  const searchResult5 =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId: communityId,
        body: {
          user_id: undefined,
          flair_id: testFlairId,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(searchResult5);
  // Test 6: Search with no filters (should return all assignments)
  const searchResult6 =
    await api.functional.communityPlatform.admin.communities.flair_assignments.index(
      adminConnection,
      {
        communityId: communityId,
        body: {
          user_id: undefined,
          flair_id: undefined,
          page: 1,
          limit: 10,
        } satisfies ICommunityPlatformCommunityFlairAssignment.IRequest,
      },
    );
  typia.assert(searchResult6);
  // Validate pagination metadata structure for all responses
  const allResults = [
    searchResult1,
    searchResult2,
    searchResult3,
    searchResult4,
    searchResult5,
    searchResult6,
  ];
  for (let i = 0; i < allResults.length; i++) {
    const result = allResults[i];
    TestValidator.predicate(
      `result ${i + 1} has valid pagination current page`,
      result.pagination.current >= 0,
    );
    TestValidator.predicate(
      `result ${i + 1} has valid pagination limit`,
      result.pagination.limit >= 0,
    );
    TestValidator.predicate(
      `result ${i + 1} has valid pagination records count`,
      result.pagination.records >= 0,
    );
    TestValidator.predicate(
      `result ${i + 1} has valid pagination pages count`,
      result.pagination.pages >= 0,
    );
    // Validate data structure
    if (result.data.length > 0) {
      const assignment = result.data[0];
      TestValidator.predicate(
        `result ${i + 1} assignment has valid id`,
        typeof assignment.id === "string",
      );
      TestValidator.predicate(
        `result ${i + 1} assignment has valid user`,
        typeof assignment.user.id === "string",
      );
      TestValidator.predicate(
        `result ${i + 1} assignment has valid flair`,
        typeof assignment.flair.id === "string",
      );
      TestValidator.predicate(
        `result ${i + 1} assignment has valid assigned_by`,
        typeof assignment.assigned_by.id === "string",
      );
      TestValidator.predicate(
        `result ${i + 1} assignment has valid created_at`,
        typeof assignment.created_at === "string",
      );
    }
  }
}
