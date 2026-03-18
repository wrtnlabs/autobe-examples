import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformCommunityBan";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_community_bans_search_ban_reason_case_insensitive_with_lifted_vs_active(
  connection: api.IConnection,
): Promise<void> {
  // 1) Admin authorization
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminAuth);
  const keyword = "sPaM";
  const keywordLower = keyword.toLowerCase();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bannedUserId = typia.random<string & tags.Format<"uuid">>();
  // 3) onlyActive=true
  const activePage = await api.functional.communityPlatform.admin.bans.index(
    adminConnection,
    {
      body: {
        onlyActive: true,
        onlyLifted: null,
        communityId,
        bannedUserId,
        banReason: keyword,
        page: 1,
        limit: 10,
        sortBy: "created_at",
        sortDirection: "desc",
      } satisfies ICommunityPlatformCommunityBan.IRequest,
    },
  );
  typia.assert(activePage);
  for (const ban of activePage.data) {
    TestValidator.predicate(
      "active ban must have unbannedAt = null",
      () => ban.unbannedAt === null,
    );
    TestValidator.predicate(
      "banReason must include keyword (case-insensitive)",
      () => ban.banReason.toLowerCase().includes(keywordLower),
    );
    TestValidator.equals("communityId matches", ban.communityId, communityId);
    TestValidator.equals(
      "bannedUserId matches",
      ban.bannedUserId,
      bannedUserId,
    );
  }
  // 5) onlyLifted=true
  const liftedPage = await api.functional.communityPlatform.admin.bans.index(
    adminConnection,
    {
      body: {
        onlyActive: null,
        onlyLifted: true,
        communityId,
        bannedUserId,
        banReason: keyword,
        page: 1,
        limit: 10,
        sortBy: "created_at",
        sortDirection: "desc",
      } satisfies ICommunityPlatformCommunityBan.IRequest,
    },
  );
  typia.assert(liftedPage);
  for (const ban of liftedPage.data) {
    TestValidator.predicate(
      "lifted ban must have unbannedAt non-null",
      () => ban.unbannedAt !== null,
    );
    TestValidator.predicate(
      "banReason must include keyword (case-insensitive)",
      () => ban.banReason.toLowerCase().includes(keywordLower),
    );
    TestValidator.equals("communityId matches", ban.communityId, communityId);
    TestValidator.equals(
      "bannedUserId matches",
      ban.bannedUserId,
      bannedUserId,
    );
  }
  // Cross-check exclusivity when both pages return data
  const activeIds = new Set(activePage.data.map((x) => x.id));
  for (const ban of liftedPage.data) {
    TestValidator.predicate(
      "same ban record must not appear in both active and lifted results",
      () => !activeIds.has(ban.id),
    );
  }
}
