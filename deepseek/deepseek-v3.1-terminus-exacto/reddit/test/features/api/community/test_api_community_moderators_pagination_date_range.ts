import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_user_join } from "../../../authorize/authorize_user_join";
import { authorize_user_login } from "../../../authorize/authorize_user_login";
import { authorize_user_refresh } from "../../../authorize/authorize_user_refresh";
import { generate_random_community_platform_user_communities_create } from "../../../generate/generate_random_community_platform_user_communities_create";
import { generate_random_community_platform_user_communities_moderators_create } from "../../../generate/generate_random_community_platform_user_communities_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_moderators_pagination_date_range(
  connection: api.IConnection,
): Promise<void> {
  // Create community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_user_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "password123",
      username: RandomGenerator.alphabets(10),
    } satisfies ICommunityPlatformUser.IJoin,
  });
  typia.assert(owner);
  // Create community
  const community =
    await generate_random_community_platform_user_communities_create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(15),
          description: RandomGenerator.paragraph({ sentences: 3 }),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Create multiple users to assign as moderators
  const moderatorUsers = await ArrayUtil.asyncRepeat(20, async () => {
    const userConnection: api.IConnection = { host: connection.host };
    const user = await authorize_user_join(userConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "password123",
        username: RandomGenerator.alphabets(10),
      } satisfies ICommunityPlatformUser.IJoin,
    });
    typia.assert(user);
    return user;
  });
  // Assign moderators sequentially with realistic date staggering
  const moderatorAssignments: ICommunityPlatformCommunityModerator[] = [];
  for (let i = 0; i < 20; i++) {
    // Wait briefly between assignments to ensure distinct timestamps
    if (i > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    const moderator =
      await generate_random_community_platform_user_communities_moderators_create(
        ownerConnection,
        {
          params: { communityId: community.id },
          body: {
            user_id: moderatorUsers[i].id,
            role_level: "moderator",
            notes: `Moderator assignment ${i + 1}`,
          } satisfies ICommunityPlatformCommunityModerator.ICreate,
        },
      );
    typia.assert(moderator);
    moderatorAssignments.push(moderator);
  }
  // Sort assignments by date for testing
  moderatorAssignments.sort(
    (a, b) =>
      new Date(a.assigned_at).getTime() - new Date(b.assigned_at).getTime(),
  );
  // Test pagination with different limits
  const pageSizes = [5, 10, 15] as const;
  for (const limit of pageSizes) {
    const page1 =
      await api.functional.communityPlatform.communities.moderators.index(
        ownerConnection,
        {
          communityId: community.id,
          body: {
            page: 1,
            limit: limit,
          } satisfies ICommunityPlatformCommunityModerator.IRequest,
        },
      );
    typia.assert(page1);
    TestValidator.equals(
      `page 1 limit ${limit} data count`,
      page1.data.length,
      Math.min(limit, 20),
    );
    TestValidator.equals(
      `page 1 limit ${limit} pagination limit`,
      page1.pagination.limit,
      limit,
    );
    TestValidator.equals(
      `page 1 limit ${limit} pagination current`,
      page1.pagination.current,
      1,
    );
    TestValidator.equals(
      `page 1 limit ${limit} total records`,
      page1.pagination.records,
      20,
    );
    TestValidator.equals(
      `page 1 limit ${limit} total pages`,
      page1.pagination.pages,
      Math.ceil(20 / limit),
    );
    // Test second page
    const page2 =
      await api.functional.communityPlatform.communities.moderators.index(
        ownerConnection,
        {
          communityId: community.id,
          body: {
            page: 2,
            limit: limit,
          } satisfies ICommunityPlatformCommunityModerator.IRequest,
        },
      );
    typia.assert(page2);
    const expectedPage2Count = Math.max(0, Math.min(limit, 20 - limit));
    TestValidator.equals(
      `page 2 limit ${limit} data count`,
      page2.data.length,
      expectedPage2Count,
    );
    TestValidator.equals(
      `page 2 limit ${limit} pagination current`,
      page2.pagination.current,
      2,
    );
  }
  // Test date range filtering using actual assignment dates
  const middleIndex = Math.floor(moderatorAssignments.length / 2);
  const startDate = new Date(moderatorAssignments[middleIndex - 2].assigned_at);
  const endDate = new Date(moderatorAssignments[middleIndex + 2].assigned_at);
  const dateFiltered =
    await api.functional.communityPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          assigned_at_start: startDate.toISOString(),
          assigned_at_end: endDate.toISOString(),
          limit: 20,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(dateFiltered);
  // Should get moderators assigned within the date range
  TestValidator.predicate(
    "date filtered results exist",
    dateFiltered.data.length > 0,
  );
  // Verify that all returned moderators are within the date range
  for (const moderator of dateFiltered.data) {
    const assignedAt = new Date(moderator.assigned_at);
    TestValidator.predicate(
      "moderator assignment date within range",
      assignedAt >= startDate && assignedAt <= endDate,
    );
  }
  // Test pagination with date filtering
  const paginatedDateFiltered =
    await api.functional.communityPlatform.communities.moderators.index(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          assigned_at_start: startDate.toISOString(),
          assigned_at_end: endDate.toISOString(),
          page: 1,
          limit: 2,
        } satisfies ICommunityPlatformCommunityModerator.IRequest,
      },
    );
  typia.assert(paginatedDateFiltered);
  TestValidator.predicate(
    "paginated date filtered has correct structure",
    paginatedDateFiltered.pagination.limit === 2 &&
      paginatedDateFiltered.data.length <= 2,
  );
  // Validate moderator summary structure
  for (const moderator of paginatedDateFiltered.data) {
    TestValidator.predicate("moderator has id", !!moderator.id);
    TestValidator.predicate(
      "moderator has assigned_at",
      !!moderator.assigned_at,
    );
    TestValidator.predicate("moderator has role_level", !!moderator.role_level);
    TestValidator.predicate(
      "moderator has is_active",
      typeof moderator.is_active === "boolean",
    );
    TestValidator.predicate("moderator has user summary", !!moderator.user);
    TestValidator.predicate("user has id", !!moderator.user.id);
    TestValidator.predicate("user has username", !!moderator.user.username);
    TestValidator.predicate(
      "user has karma",
      typeof moderator.user.karma === "number",
    );
    TestValidator.predicate("user has created_at", !!moderator.user.created_at);
  }
}
