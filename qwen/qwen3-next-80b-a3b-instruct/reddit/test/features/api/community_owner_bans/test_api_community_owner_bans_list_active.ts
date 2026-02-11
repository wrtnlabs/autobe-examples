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
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_community_owner_join } from "../../../authorize/authorize_community_owner_join";
import { authorize_community_owner_login } from "../../../authorize/authorize_community_owner_login";
import { authorize_community_owner_refresh } from "../../../authorize/authorize_community_owner_refresh";

export async function test_api_community_owner_bans_list_active(
  connection: api.IConnection,
): Promise<void> {
  // Create community owner account
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerCredentials = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(16),
  } satisfies IRedditCommunityCommunityOwner.IJoin;
  const ownerResult = await authorize_community_owner_join(ownerConnection, {
    body: ownerCredentials,
  });
  typia.assert(ownerResult);
  // Log in to get authorized connection
  const authorizedOwnerConnection: api.IConnection = { host: connection.host };
  const loginResult = await authorize_community_owner_login(
    authorizedOwnerConnection,
    {
      body: {
        email: ownerCredentials.email,
        password: ownerCredentials.password,
      } satisfies IRedditCommunityCommunityOwner.ILogin,
    },
  ).catch((err) => {
    throw new Error(`Failed to login owner: ${err.message}`);
  });
  typia.assert(loginResult);
  // List active bans
  const banListResponse =
    await api.functional.redditCommunity.communityOwner.bans.index(
      authorizedOwnerConnection,
      {
        body: {
          deleted_at: null,
        } satisfies IRedditCommunityBanOfMember.IRequest,
      },
    );
  typia.assert(banListResponse);
  // Validate response structure
  TestValidator.equals(
    "pagination structure: current page",
    banListResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination structure: limit",
    banListResponse.pagination.limit,
    10,
  );
  TestValidator.predicate(
    "records count is non-negative",
    banListResponse.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pages count is non-negative",
    banListResponse.pagination.pages >= 0,
  );
  TestValidator.predicate(
    "data array exists",
    Array.isArray(banListResponse.data),
  );
  // Validate each ban record structure
  for (const ban of banListResponse.data) {
    TestValidator.equals("ban ID format", typeof ban.id, "string");
    TestValidator.predicate(
      "ban ID is UUID",
      /^[0-9a-f]{8}-([0-9a-f]{4}-){3}[0-9a-f]{12}$/i.test(ban.id),
    );
    TestValidator.equals("ban reason is string", typeof ban.reason, "string");
    TestValidator.predicate(
      "created_at is valid date-time",
      new Date(ban.created_at).toISOString() === ban.created_at,
    );
    // Validate moderator
    TestValidator.predicate(
      "moderator has id",
      typeof ban.moderator.id === "string" && ban.moderator.id.length > 0,
    );
    TestValidator.predicate(
      "moderator has display_name",
      typeof ban.moderator.display_name === "string" &&
        ban.moderator.display_name.length > 0,
    );
    TestValidator.predicate(
      "moderator has created_at",
      new Date(ban.moderator.created_at).toISOString() ===
        ban.moderator.created_at,
    );
    // Validate community
    TestValidator.predicate(
      "community has id",
      typeof ban.community.id === "string" && ban.community.id.length > 0,
    );
    TestValidator.predicate(
      "community has name",
      typeof ban.community.name === "string" && ban.community.name.length > 0,
    );
    TestValidator.predicate(
      "community has created_at",
      new Date(ban.community.created_at).toISOString() ===
        ban.community.created_at,
    );
    // Validate banned_actor
    TestValidator.predicate(
      "banned_actor is populated",
      ban.banned_actor !== null && ban.banned_actor !== undefined,
    );
    TestValidator.predicate(
      "banned_actor has id",
      typeof ban.banned_actor.id === "string" && ban.banned_actor.id.length > 0,
    );
    TestValidator.predicate(
      "banned_actor has display_name",
      typeof ban.banned_actor.display_name === "string" &&
        ban.banned_actor.display_name.length > 0,
    );
    // Type-safe validation based on the actual type of banned_actor
    const bannedActor = ban.banned_actor;
    // Create a type guard function for types that have created_at
    const hasCreatedAt = (
      obj: any,
    ): obj is
      | IRedditCommunityMember.ISummary
      | IRedditCommunityCommunityModerator.ISummary =>
      "created_at" in obj && typeof obj.created_at === "string";
    if (hasCreatedAt(bannedActor)) {
      TestValidator.predicate(
        "banned_actor (member/moderator) has valid created_at",
        new Date(bannedActor.created_at).toISOString() ===
          bannedActor.created_at,
      );
    }
    // For IRedditCommunityCommunityOwner.ISummary (no created_at), no validation needed
    // Ensure no null properties expected to be present
    if (ban.moderator.bio !== undefined)
      TestValidator.predicate(
        "moderator bio is string or null",
        typeof ban.moderator.bio === "string" || ban.moderator.bio === null,
      );
    if (ban.moderator.avatar_url !== undefined)
      TestValidator.predicate(
        "moderator avatar_url is string or null",
        typeof ban.moderator.avatar_url === "string" ||
          ban.moderator.avatar_url === null,
      );
    if (ban.community.description !== undefined)
      TestValidator.predicate(
        "community description is string or null",
        typeof ban.community.description === "string" ||
          ban.community.description === null,
      );
    if (ban.community.icon_url !== undefined)
      TestValidator.predicate(
        "community icon_url is string or null",
        typeof ban.community.icon_url === "string" ||
          ban.community.icon_url === null,
      );
    if (ban.banned_actor.bio !== undefined)
      TestValidator.predicate(
        "banned_actor bio is string or null",
        typeof ban.banned_actor.bio === "string" ||
          ban.banned_actor.bio === null,
      );
    if (ban.banned_actor.avatar_url !== undefined)
      TestValidator.predicate(
        "banned_actor avatar_url is string or null",
        typeof ban.banned_actor.avatar_url === "string" ||
          ban.banned_actor.avatar_url === null,
      );
  }
}
