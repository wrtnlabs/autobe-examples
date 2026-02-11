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

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";
import { authorize_platform_admin_join } from "../../../authorize/authorize_platform_admin_join";
import { authorize_platform_admin_login } from "../../../authorize/authorize_platform_admin_login";
import { authorize_platform_admin_refresh } from "../../../authorize/authorize_platform_admin_refresh";

export async function test_api_platform_admin_fetch_historical_bans(
  connection: api.IConnection,
): Promise<void> {
  // As a platform administrator, authenticate via /auth/platformadmin/join, then call /redditCommunity/communityModerator/bans with deleted_at set to true
  // to retrieve all historical (inactive) bans across the platform. Validate that response contains a IPageIRedditCommunityBanOfMember.ISummary
  // page with data array of past bans, each with correct ban details including reason, timestamp, and actor identities.
  // Confirm that banned_actor summaries reflect actor state at time of ban (not current state), and pagination is properly calculated for large historical result sets.
  // Step 1: Create platform admin account using utility
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoinResponse = await authorize_platform_admin_join(
    adminConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
      } satisfies IRedditCommunityPlatformAdmin.IJoin,
    },
  );
  // Step 2: Authenticate as platform admin
  const adminLoginBody: IRedditCommunityPlatformAdmin.ILogin = {
    email: adminJoinResponse.token.access.split(".")[0],
    password: RandomGenerator.alphaNumeric(16),
  };
  await authorize_platform_admin_login(adminConnection, {
    body: adminLoginBody,
  });
  // Step 3: Create a member to ban (we'll use a community moderator account)
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResponse = await authorize_community_moderator_join(
    memberConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(32),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  // Step 4: Query historical bans: deleted_at !== null (use true to represent non-null)
  const request: IRedditCommunityBanOfMember.IRequest = {
    deleted_at: true, // According to DTO, deleted_at: boolean | null | undefined; true value will be converted to non-null timestamp
  };
  const bans =
    await api.functional.redditCommunity.communityModerator.bans.index(
      adminConnection,
      { body: request },
    );
  typia.assert(bans);
  // Step 5: Validate response structure with business logic only
  TestValidator.predicate("bans data exists", () => bans.data.length > 0);
  TestValidator.equals(
    "pagination records match data count",
    bans.pagination.records,
    bans.data.length,
  );
  TestValidator.predicate(
    "pagination is valid",
    () =>
      bans.pagination.current > 0 &&
      bans.pagination.limit > 0 &&
      bans.pagination.pages > 0,
  );
  // Step 6: Validate each ban has correct structure and actor state
  for (const ban of bans.data) {
    // Validate basic ban properties
    TestValidator.equals("ban has valid id", typeof ban.id, "string");
    TestValidator.equals("ban has reason", typeof ban.reason, "string");
    TestValidator.equals("ban has created_at", typeof ban.created_at, "string");
    // Validate moderator summary
    TestValidator.equals("moderator has id", typeof ban.moderator.id, "string");
    TestValidator.equals(
      "moderator has display_name",
      typeof ban.moderator.display_name,
      "string",
    );
    if (ban.moderator.bio !== undefined) {
      TestValidator.equals(
        "moderator bio is string or null",
        typeof ban.moderator.bio,
        "string",
      );
    }
    if (ban.moderator.avatar_url !== undefined) {
      TestValidator.equals(
        "moderator avatar_url is string or null",
        typeof ban.moderator.avatar_url,
        "string",
      );
    }
    // Validate community summary
    TestValidator.equals("community has id", typeof ban.community.id, "string");
    TestValidator.equals(
      "community has name",
      typeof ban.community.name,
      "string",
    );
    if (ban.community.description !== undefined) {
      TestValidator.equals(
        "community description is string or null",
        typeof ban.community.description,
        "string",
      );
    }
    if (ban.community.icon_url !== undefined) {
      TestValidator.equals(
        "community icon_url is string or null",
        typeof ban.community.icon_url,
        "string",
      );
    }
    TestValidator.predicate(
      "community subscriber_count is non-negative",
      () => ban.community.subscriber_count >= 0,
    );
    // Validate banned_actor
    const actor = ban.banned_actor;
    TestValidator.equals("banned_actor has id", typeof actor.id, "string");
    TestValidator.equals(
      "banned_actor has display_name",
      typeof actor.display_name,
      "string",
    );
    if ("bio" in actor && actor.bio !== undefined) {
      TestValidator.equals(
        "actor bio is string or null",
        typeof actor.bio,
        "string",
      );
    }
    if ("avatar_url" in actor && actor.avatar_url !== undefined) {
      TestValidator.equals(
        "actor avatar_url is string or null",
        typeof actor.avatar_url,
        "string",
      );
    }
  }
}
