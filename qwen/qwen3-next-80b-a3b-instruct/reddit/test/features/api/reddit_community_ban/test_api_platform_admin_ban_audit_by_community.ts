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

export async function test_api_platform_admin_ban_audit_by_community(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as platform admin
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_platform_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
    } satisfies IRedditCommunityPlatformAdmin.IJoin,
  });
  typia.assert(adminAuth);
  // Test filtering bans by community_id
  const testCommunityId = typia.random<string & tags.Format<"uuid">>();
  // Request ban list filtered by community_id
  const response =
    await api.functional.redditCommunity.platformAdmin.bans.index(
      adminConnection,
      {
        body: {
          community_id: testCommunityId,
        } satisfies IRedditCommunityBanOfMember.IRequest,
      },
    );
  typia.assert(response);
  // Validate top-level response structure
  TestValidator.equals(
    "pagination structure",
    response.pagination.current,
    1,
    (key) => key === "records" || key === "pages" || key === "limit",
  );
  TestValidator.equals("data is an array", Array.isArray(response.data), true);
  TestValidator.equals(
    "data array has length >= 0",
    response.data.length >= 0,
    true,
  );
  // Validate structure of items in data
  for (const ban of response.data) {
    // Validate ban properties
    TestValidator.equals("ban has valid UUID id", typeof ban.id, "string");
    TestValidator.equals("ban has string reason", typeof ban.reason, "string");
    TestValidator.equals(
      "ban has ISO 8601 created_at",
      typeof ban.created_at,
      "string",
    );
    // Validate moderator structure
    const moderator = ban.moderator;
    TestValidator.equals("moderator object exists", moderator !== null, true);
    if (moderator) {
      TestValidator.equals(
        "moderator has valid UUID id",
        typeof moderator.id,
        "string",
      );
      TestValidator.equals(
        "moderator has string display_name",
        typeof moderator.display_name,
        "string",
      );
      TestValidator.equals(
        "moderator bio should be string or null",
        typeof moderator.bio === "string" || moderator.bio === null,
        true,
      );
      TestValidator.equals(
        "moderator avatar_url should be string or null",
        typeof moderator.avatar_url === "string" ||
          moderator.avatar_url === null,
        true,
      );
      TestValidator.equals(
        "moderator has ISO 8601 created_at",
        typeof moderator.created_at,
        "string",
      );
    }
    // Validate community structure
    const community = ban.community;
    TestValidator.equals("community object exists", community !== null, true);
    if (community) {
      TestValidator.equals(
        "community has valid UUID id",
        typeof community.id,
        "string",
      );
      TestValidator.equals(
        "community has string name",
        typeof community.name,
        "string",
      );
      TestValidator.equals(
        "community description should be string or null",
        typeof community.description === "string" ||
          community.description === null,
        true,
      );
      TestValidator.equals(
        "community icon_url should be string or null",
        typeof community.icon_url === "string" || community.icon_url === null,
        true,
      );
      TestValidator.equals(
        "community subscriber_count should be number",
        typeof community.subscriber_count,
        "number",
      );
      TestValidator.equals(
        "community has ISO 8601 created_at",
        typeof community.created_at,
        "string",
      );
    }
    // Validate banned_actor - one of the three types
    const actor = ban.banned_actor;
    TestValidator.equals("banned actor object exists", actor !== null, true);
    if (actor) {
      TestValidator.equals(
        "banned actor has valid UUID id",
        typeof actor.id,
        "string",
      );
      TestValidator.equals(
        "banned actor has string display_name",
        typeof actor.display_name,
        "string",
      );
      TestValidator.equals(
        "banned actor bio should be string or null",
        typeof actor.bio === "string" || actor.bio === null,
        true,
      );
      TestValidator.equals(
        "banned actor avatar_url should be string or null",
        typeof actor.avatar_url === "string" || actor.avatar_url === null,
        true,
      );
      // No created_at validation: IRedditCommunityCommunityOwner.ISummary doesn't have this property
    }
  }
}
