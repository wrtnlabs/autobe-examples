import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditPlatformModerationAuditLog";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformModerationAuditLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModerationAuditLog";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";

export async function test_api_moderation_audit_logs_filtering_and_sorting(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup - Create admin account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: "admin@test.com",
      username: "admin_test",
      password: "admin1234",
      display_name: "Test Admin",
      bio: "Test administrator account",
      avatar_url: null,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(adminJoinResult);
  // 2. Create test community
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: "owner@test.com",
      username: "community_owner",
      password: "password1234",
      displayName: "Community Owner",
      bio: "Community owner",
      avatarUrl: null,
      href: "http://localhost:3000",
      referrer: "http://localhost:3000",
    },
  });
  typia.assert(memberJoinResult);
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "test_community_audit",
          description: "Test community for audit log filtering",
          icon_url: null,
        },
      },
    );
  typia.assert(community);
  // 3. Create multiple members to act as moderators and perform actions
  const members: IRedditPlatformMember.ISummary[] = [];
  for (let i = 0; i < 5; i++) {
    const memberResult = await authorize_member_join(memberConnection, {
      body: {
        email: `moderator_${i}@test.com`,
        username: `moderator_${i}`,
        password: "password1234",
        displayName: `Moderator ${i}`,
        bio: `Test moderator ${i}`,
        avatarUrl: null,
        href: "http://localhost:3000",
        referrer: "http://localhost:3000",
      },
    });
    typia.assert(memberResult);
    members.push(memberResult.user);
    // Assign as moderator
    await api.functional.redditPlatform.member.communities.moderators.addModerator(
      memberConnection,
      {
        communityId: community.id,
        userId: memberResult.user.id,
      },
    );
  }
  // 4. Login as admin to test audit log endpoint
  const adminLoginConnection: api.IConnection = { host: connection.host };
  const adminLoginResult = await authorize_admin_login(adminLoginConnection, {
    body: {
      email: "admin@test.com",
      password: "admin1234",
    },
  });
  typia.assert(adminLoginResult);
  // 5. Test filtering and sorting
  const communityId = community.id;
  // Test 1: Get all logs (no filter)
  const allLogs =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: {},
      },
    );
  typia.assert(allLogs);
  // Test 2: Filter by actionType
  const appointModeratorLogs =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: { actionType: "appoint_moderator" },
      },
    );
  typia.assert(appointModeratorLogs);
  const deletePostLogs =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: { actionType: "delete_post" },
      },
    );
  typia.assert(deletePostLogs);
  // Test 3: Filter by moderatorId
  const moderator1Logs =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: { moderatorId: members[0].id },
      },
    );
  typia.assert(moderator1Logs);
  // Test 4: Sort by created_at DESC (default)
  const sortedDesc =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: { sortBy: "created_at", sortOrder: "DESC" },
      },
    );
  typia.assert(sortedDesc);
  // Test 5: Sort by created_at ASC
  const sortedAsc =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: { sortBy: "created_at", sortOrder: "ASC" },
      },
    );
  typia.assert(sortedAsc);
  // Test 6: Sort by action_type
  const sortedByActionType =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: { sortBy: "action_type" },
      },
    );
  typia.assert(sortedByActionType);
  // Test 7: Sort by moderator_id
  const sortedByModerator =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: { sortBy: "moderator_id" },
      },
    );
  typia.assert(sortedByModerator);
  // Test 8: Pagination with page/limit
  const paginatedLogs =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: { page: 1, limit: 5 },
      },
    );
  typia.assert(paginatedLogs);
  // Test 9: Date range filtering
  const now = new Date();
  const startDate = new Date(now.getTime() - 86400000 * 7); // 7 days ago
  const endDate = new Date();
  const dateFilteredLogs =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: {
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString(),
        },
      },
    );
  typia.assert(dateFilteredLogs);
  // Test 10: Text search
  const searchQueryLogs =
    await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
      adminLoginConnection,
      {
        communityId,
        body: { searchQuery: "test" },
      },
    );
  typia.assert(searchQueryLogs);
  // Test 11: Cursor-based pagination
  if (paginatedLogs.data.length > 0) {
    const lastId = paginatedLogs.data[paginatedLogs.data.length - 1].id;
    const cursorPaginatedLogs =
      await api.functional.redditPlatform.admin.communities.moderation_audit_logs.index(
        adminLoginConnection,
        {
          communityId,
          body: { lastId },
        },
      );
    typia.assert(cursorPaginatedLogs);
  }
  // Validate pagination metadata
  TestValidator.equals(
    "pagination current",
    paginatedLogs.pagination.current,
    1,
  );
  TestValidator.equals("pagination limit", paginatedLogs.pagination.limit, 5);
  TestValidator.predicate(
    "pagination records is number",
    typeof paginatedLogs.pagination.records === "number",
  );
  TestValidator.predicate(
    "pagination pages is number",
    typeof paginatedLogs.pagination.pages === "number",
  );
  // Validate sorting: DESC should have most recent first
  if (sortedDesc.data.length > 1) {
    for (let i = 0; i < sortedDesc.data.length - 1; i++) {
      const createdAt1 = new Date(sortedDesc.data[i].created_at).getTime();
      const createdAt2 = new Date(sortedDesc.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `sort DESC: ${sortedDesc.data[i].id} >= ${sortedDesc.data[i + 1].id}`,
        createdAt1 >= createdAt2,
      );
    }
  }
  // Validate sorting: ASC should have oldest first
  if (sortedAsc.data.length > 1) {
    for (let i = 0; i < sortedAsc.data.length - 1; i++) {
      const createdAt1 = new Date(sortedAsc.data[i].created_at).getTime();
      const createdAt2 = new Date(sortedAsc.data[i + 1].created_at).getTime();
      TestValidator.predicate(
        `sort ASC: ${sortedAsc.data[i].id} <= ${sortedAsc.data[i + 1].id}`,
        createdAt1 <= createdAt2,
      );
    }
  }
}
