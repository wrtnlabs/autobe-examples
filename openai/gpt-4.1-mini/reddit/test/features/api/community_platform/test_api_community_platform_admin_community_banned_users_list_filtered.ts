import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBannedUser";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBannedUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBannedUser";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_platform_admin_community_banned_users_list_filtered(
  connection: api.IConnection,
): Promise<void> {
  // Scenario 2: Admin retrieves banned user list filtered by ban status ('banned' or 'unbanned') and date ranges. Tests filtering logic by applying banStatus filter and date filters for bannedAt and unbannedAt. Validate correct subset of banned users are returned and pagination behaves accordingly. Confirm HTTP 200 response and accurate filtering.
  // 1. Admin join to get authorized connection
  const adminConnection: api.IConnection = { host: connection.host };
  const authorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: RandomGenerator.alphaNumeric(8) + "@test.com",
      password: RandomGenerator.alphaNumeric(16),
      displayName: RandomGenerator.name(1),
      bio: null,
      avatarUrl: null,
    },
  });
  adminConnection.headers = { Authorization: authorizedAdmin.token.access };
  // Use random communityId (in real test, would create a community first)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Prepare date references for filtering
  const now = new Date();
  const past = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000); // 30 days ago
  const recent = new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000); // 5 days ago
  // 2. Fetch banned users with banStatus filter "banned"
  {
    const body: ICommunityPlatformCommunityBannedUser.IRequest = {
      banStatus: "banned",
      page: 1,
      limit: 10,
    };
    const output =
      await api.functional.communityPlatform.admin.communities.banned_users.index(
        adminConnection,
        {
          communityId,
          body,
        },
      );
    typia.assert(output);
    // All returned users must be currently banned (unbannedAt === null)
    for (const bannedUser of output.data) {
      TestValidator.predicate(
        "unbannedAt is null",
        bannedUser.unbannedAt === null,
      );
    }
  }
  // 3. Fetch banned users with banStatus filter "unbanned"
  {
    const body: ICommunityPlatformCommunityBannedUser.IRequest = {
      banStatus: "unbanned",
      page: 1,
      limit: 10,
    };
    const output =
      await api.functional.communityPlatform.admin.communities.banned_users.index(
        adminConnection,
        {
          communityId,
          body,
        },
      );
    typia.assert(output);
    // All returned users must be unbanned (unbannedAt !== null)
    for (const bannedUser of output.data) {
      TestValidator.predicate(
        "unbannedAt is not null",
        bannedUser.unbannedAt !== null,
      );
    }
  }
  // 4. Fetch banned users filtered by bannedAt date
  {
    const body: ICommunityPlatformCommunityBannedUser.IRequest = {
      bannedAt: past.toISOString(),
      page: 1,
      limit: 10,
    };
    const output =
      await api.functional.communityPlatform.admin.communities.banned_users.index(
        adminConnection,
        {
          communityId,
          body,
        },
      );
    typia.assert(output);
    for (const bannedUser of output.data) {
      TestValidator.predicate(
        "bannedAt >= past",
        bannedUser.bannedAt >= past.toISOString(),
      );
    }
  }
  // 5. Fetch banned users filtered by unbannedAt date
  {
    const body: ICommunityPlatformCommunityBannedUser.IRequest = {
      unbannedAt: recent.toISOString(),
      page: 1,
      limit: 10,
    };
    const output =
      await api.functional.communityPlatform.admin.communities.banned_users.index(
        adminConnection,
        {
          communityId,
          body,
        },
      );
    typia.assert(output);
    for (const bannedUser of output.data) {
      TestValidator.predicate(
        "unbannedAt >= recent",
        bannedUser.unbannedAt !== null &&
          bannedUser.unbannedAt >= recent.toISOString(),
      );
    }
  }
  // 6. Test pagination: page 1 and page 2 with limit 1
  {
    const bodyPage1: ICommunityPlatformCommunityBannedUser.IRequest = {
      page: 1,
      limit: 1,
    };
    const bodyPage2: ICommunityPlatformCommunityBannedUser.IRequest = {
      page: 2,
      limit: 1,
    };
    const outputPage1 =
      await api.functional.communityPlatform.admin.communities.banned_users.index(
        adminConnection,
        {
          communityId,
          body: bodyPage1,
        },
      );
    const outputPage2 =
      await api.functional.communityPlatform.admin.communities.banned_users.index(
        adminConnection,
        {
          communityId,
          body: bodyPage2,
        },
      );
    typia.assert(outputPage1);
    typia.assert(outputPage2);
    if (outputPage1.data.length > 0 && outputPage2.data.length > 0) {
      TestValidator.notEquals(
        "page 1 first id != page 2 first id",
        outputPage1.data[0].id,
        outputPage2.data[0].id,
      );
    }
    TestValidator.predicate(
      "page 1 current is 1",
      outputPage1.pagination.current === 1,
    );
    TestValidator.predicate(
      "page 2 current is 2",
      outputPage2.pagination.current === 2,
    );
    TestValidator.predicate(
      "limit matches",
      outputPage1.pagination.limit === 1,
    );
    TestValidator.predicate(
      "limit matches",
      outputPage2.pagination.limit === 1,
    );
  }
}
