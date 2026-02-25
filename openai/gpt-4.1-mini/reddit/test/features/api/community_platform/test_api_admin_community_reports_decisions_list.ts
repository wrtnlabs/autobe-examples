import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformReportsDecision";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformReportsDecision } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformReportsDecision";
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
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";

export async function test_api_admin_community_reports_decisions_list(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 1: Successful retrieval by authorized admin
  {
    // Admin join (sign up)
    const adminJoinConnection: api.IConnection = { host: connection.host };
    const adminAuthorized = await authorize_admin_join(adminJoinConnection, {});
    typia.assert(adminAuthorized);
    // Admin login for actor switching
    const adminLoginConnection: api.IConnection = { host: connection.host };
    const adminLoggedIn = await authorize_admin_login(adminLoginConnection, {
      body: {
        email: adminAuthorized.email,
        password: adminAuthorized.token.access, // The password is not the token, but we don't have clear password, so use join connection for calls.
      },
    }).catch(() => null);
    // Use adminJoinConnection if login fails
    const adminConnection = adminLoggedIn ?? adminJoinConnection;
    // User join (sign up to create community)
    const userConnection: api.IConnection = { host: connection.host };
    const userAuthorized = await authorize_user_join(userConnection, {});
    typia.assert(userAuthorized);
    // User creates a community
    const community =
      await generate_random_community_platform_user_communities_create(
        userConnection,
        {
          body: {
            name: `test-community-${RandomGenerator.alphabets(6)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            iconUrl: `https://cdn.example.com/icons/${RandomGenerator.alphaNumeric(8)}.png`,
          },
        },
      );
    typia.assert(community);
    // Admin requests paginated report decisions for the community
    const patchBody: ICommunityPlatformReportsDecision.IRequest = {
      page: 1,
      limit: 10,
      reportId: "00000000-0000-0000-0000-000000000001",
      decision: "approve",
    };
    const decisions =
      await api.functional.communityPlatform.admin.communities.reports.decisions.index(
        adminJoinConnection,
        {
          communityId: community.id,
          body: patchBody,
        },
      );
    typia.assert(decisions);
    // Validate pagination metadata
    TestValidator.predicate(
      "pagination current page >= 1",
      decisions.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit > 0",
      decisions.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      decisions.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      decisions.pagination.pages >= 0,
    );
    // Validate that data is sorted by created_at descending
    for (let i = 0; i < decisions.data.length - 1; i++) {
      const curr = decisions.data[i];
      const next = decisions.data[i + 1];
      if (curr.created_at < next.created_at) {
        throw new Error(
          `Data is not sorted by created_at descending at index ${i}`,
        );
      }
    }
    // Check each decision summary structure
    for (const item of decisions.data) {
      typia.assert(item);
      if (!(item.status === "approved" || item.status === "dismissed"))
        throw new Error(`Invalid status: ${item.status}`);
      // comment is nullable
      typia.assert<string | null | undefined>(item.comment);
      typia.assert(item.moderator);
      typia.assert(item.created_at);
      if (item.updated_at !== null) typia.assert(item.updated_at);
    }
  }
  // Scenario 2: Authorization failure when unauthorized user tries to access
  {
    // User join
    const userConnection: api.IConnection = { host: connection.host };
    const userAuthorized = await authorize_user_join(userConnection, {});
    typia.assert(userAuthorized);
    // User creates a community
    const community =
      await generate_random_community_platform_user_communities_create(
        userConnection,
        {
          body: {
            name: `test-community-${RandomGenerator.alphabets(6)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            iconUrl: `https://cdn.example.com/icons/${RandomGenerator.alphaNumeric(8)}.png`,
          },
        },
      );
    typia.assert(community);
    // User attempts to access admin-only endpoint, expecting 403 forbidden
    await TestValidator.httpError(
      "403 forbidden for unauthorized user",
      403,
      async () => {
        await api.functional.communityPlatform.admin.communities.reports.decisions.index(
          userConnection,
          {
            communityId: community.id,
            body: {
              page: 1,
              limit: 10,
              reportId: "00000000-0000-0000-0000-000000000001",
              decision: "approve",
            },
          },
        );
      },
    );
  }
  // Scenario 3: Pagination boundary test
  {
    // Admin join
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuthorized = await authorize_admin_join(adminConnection, {});
    typia.assert(adminAuthorized);
    // User join and create community
    const userConnection: api.IConnection = { host: connection.host };
    const userAuthorized = await authorize_user_join(userConnection, {});
    typia.assert(userAuthorized);
    const community =
      await generate_random_community_platform_user_communities_create(
        userConnection,
        {
          body: {
            name: `test-community-${RandomGenerator.alphabets(6)}`,
            description: RandomGenerator.paragraph({ sentences: 3 }),
            iconUrl: `https://cdn.example.com/icons/${RandomGenerator.alphaNumeric(8)}.png`,
          },
        },
      );
    typia.assert(community);
    // Request page beyond available data
    const patchBody: ICommunityPlatformReportsDecision.IRequest = {
      page: 9999, // beyond available pages
      limit: 10,
      reportId: "00000000-0000-0000-0000-000000000001",
      decision: "approve",
    };
    const decisions =
      await api.functional.communityPlatform.admin.communities.reports.decisions.index(
        adminConnection,
        {
          communityId: community.id,
          body: patchBody,
        },
      );
    typia.assert(decisions);
    // Data array should be empty
    TestValidator.equals(
      "empty data array for high page number",
      decisions.data,
      [],
    );
    // Pagination metadata validity
    TestValidator.predicate(
      "pagination current page >= 1",
      decisions.pagination.current >= 1,
    );
    TestValidator.predicate(
      "pagination limit > 0",
      decisions.pagination.limit > 0,
    );
    TestValidator.predicate(
      "pagination records >= 0",
      decisions.pagination.records >= 0,
    );
    TestValidator.predicate(
      "pagination pages >= 0",
      decisions.pagination.pages >= 0,
    );
  }
}
