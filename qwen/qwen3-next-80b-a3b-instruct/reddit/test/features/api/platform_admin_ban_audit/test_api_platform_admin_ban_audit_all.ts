import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCommunityBanOfMember";
import type { IRedditCommunityBanOfMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityBanOfMember";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityOwner";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityPlatformAdmin";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_ban_audit_all(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityPlatformAdmin.IJoin;
  const authResult = await authorize_platform_admin_join(adminConnection, {
    body: adminCredentials,
  });
  typia.assert(authResult);
  // Retrieve all active bans across platform
  const bans = await api.functional.redditCommunity.platformAdmin.bans.index(
    adminConnection,
    {
      body: {},
    },
  );
  typia.assert(bans);
  // Validate basic structure
  TestValidator.equals("pagination has current", bans.pagination.current, 1);
  TestValidator.equals(
    "pagination has limit",
    typeof bans.pagination.limit,
    "number",
  );
  TestValidator.equals(
    "pagination has records",
    typeof bans.pagination.records,
    "number",
  );
  TestValidator.equals(
    "pagination has pages",
    typeof bans.pagination.pages,
    "number",
  );
  // Validate that banned actor data exposes only display_name and created_at (no sensitive fields)
  for (const ban of bans.data) {
    TestValidator.equals("ban has reason", typeof ban.reason, "string");
    TestValidator.equals("ban has created_at", typeof ban.created_at, "string");
    // Validate moderator exposes only display_name and created_at
    TestValidator.equals(
      "moderator has display_name",
      typeof ban.moderator.display_name,
      "string",
    );
    TestValidator.equals(
      "moderator has created_at",
      typeof ban.moderator.created_at,
      "string",
    );
    // Since moderator is a union of ISummary types, email might not exist
    // The field is intentionally excluded, so we verify it's not present
    TestValidator.equals("moderator has no email", "email" in ban.moderator ? ban.moderator.email !== undefined : true, false);
    // The ID is exposed in the summary, so we verify it should exist
    TestValidator.equals("moderator has id", "id" in ban.moderator ? ban.moderator.id !== undefined : false, true);
    // Validate community exposes only name, icon_url, subscriber_count, created_at
    TestValidator.equals(
      "community has name",
      typeof ban.community.name,
      "string",
    );
    TestValidator.equals(
      "community has created_at",
      typeof ban.community.created_at,
      "string",
    );
    // icon_url can be null or string
    TestValidator.equals(
      "community has icon_url",
      ban.community.icon_url === null || typeof ban.community.icon_url === "string",
      true,
    );
    TestValidator.equals(
      "community has subscriber_count",
      typeof ban.community.subscriber_count,
      "number",
    );
    // Validate banned actor exposes only display_name and created_at
    TestValidator.equals(
      "banned_actor has display_name",
      typeof ban.banned_actor.display_name,
      "string",
    );
    // Ensure created_at exists on questionable unions by explicit nullish check with fallback
    const createdAt = (ban.banned_actor as any).created_at;
    TestValidator.equals(
      "banned_actor has created_at",
      typeof createdAt === "string" ? createdAt : "",
      "string",
    );
    // The ID is exposed in the summary
    TestValidator.equals("banned_actor has id", "id" in ban.banned_actor ? ban.banned_actor.id !== undefined : false, true);
  }
  // Verify response is ordered by created_at DESC
  for (let i = 0; i < bans.data.length - 1; i++) {
    const current = new Date(bans.data[i].created_at);
    const next = new Date(bans.data[i + 1].created_at);
    TestValidator.predicate("bans ordered by created_at DESC", current >= next);
  }
}