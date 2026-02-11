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

export async function test_api_community_owner_view_active_ban_list(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as a community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerEmail = typia.random<string & tags.Format<"email">>();
  const ownerPassword = RandomGenerator.alphaNumeric(16);
  await authorize_community_owner_join(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
      display_name: ownerEmail.split("@")[0],
    } satisfies IRedditCommunityCommunityOwner.IJoin,
  });
  // 2. Login to obtain authentication token
  await authorize_community_owner_login(ownerConnection, {
    body: {
      email: ownerEmail,
      password: ownerPassword,
    } satisfies IRedditCommunityCommunityOwner.ILogin,
  });
  // 3. Call bans.index with a random communityId (we must assume this endpoint accepts a UUID)
  // We're using a valid UUID format since the schema requires it
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 4. Query active bans for the community (deleted_at: null)
  const banListResponse =
    await api.functional.redditCommunity.communityOwner.communities.bans.index(
      ownerConnection,
      {
        communityId,
        body: {
          deleted_at: null, // Only active bans
        } satisfies IRedditCommunityBanOfMember.IRequest,
      },
    );
  typia.assert(banListResponse);
  // 5. Validate response structure
  TestValidator.equals(
    "pagination current page",
    banListResponse.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination limit",
    banListResponse.pagination.limit,
    10,
  ); // Default limit
  TestValidator.predicate(
    "pagination records >= 0",
    banListResponse.pagination.records >= 0,
  );
  TestValidator.equals(
    "data length",
    banListResponse.data.length,
    banListResponse.pagination.records,
  );
  // 6. Validate each response item structure
  banListResponse.data.forEach((ban) => {
    // Check mandatory fields
    TestValidator.equals("ban has id", typeof ban.id, "string");
    TestValidator.predicate("ban id is uuid", /^[0-9a-f-]{36}$/i.test(ban.id));
    TestValidator.equals("ban has reason", typeof ban.reason, "string");
    TestValidator.predicate("ban reason is not empty", ban.reason.length > 0);
    TestValidator.equals("ban has created_at", typeof ban.created_at, "string");
    TestValidator.predicate(
      "created_at is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(ban.created_at),
    );
    // Validate moderator summary
    TestValidator.equals("moderator has id", typeof ban.moderator.id, "string");
    TestValidator.predicate(
      "moderator id is uuid",
      /^[0-9a-f-]{36}$/i.test(ban.moderator.id),
    );
    TestValidator.equals(
      "moderator has display_name",
      typeof ban.moderator.display_name,
      "string",
    );
    TestValidator.predicate(
      "moderator display_name is not empty",
      ban.moderator.display_name.length > 0,
    );
    TestValidator.equals(
      "moderator has created_at",
      typeof ban.moderator.created_at,
      "string",
    );
    TestValidator.predicate(
      "moderator created_at is ISO date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/i.test(
        ban.moderator.created_at,
      ),
    );
    // Validate community summary
    TestValidator.equals("community has id", typeof ban.community.id, "string");
    TestValidator.predicate(
      "community id is uuid",
      /^[0-9a-f-]{36}$/i.test(ban.community.id),
    );
    TestValidator.equals(
      "community has name",
      typeof ban.community.name,
      "string",
    );
    TestValidator.predicate(
      "community name is not empty",
      ban.community.name.length > 0,
    );
    TestValidator.equals(
      "community has subscriber_count",
      typeof ban.community.subscriber_count,
      "number",
    );
    TestValidator.predicate(
      "community subscriber_count >= 0",
      ban.community.subscriber_count >= 0,
    );
    // Validate banned actor - one of three types, each with id and display_name
    const actor = ban.banned_actor;
    TestValidator.equals("banned actor has id", typeof actor.id, "string");
    TestValidator.predicate(
      "banned actor id is uuid",
      /^[0-9a-f-]{36}$/i.test(actor.id),
    );
    TestValidator.equals(
      "banned actor has display_name",
      typeof actor.display_name,
      "string",
    );
    TestValidator.predicate(
      "banned actor display_name is not empty",
      actor.display_name.length > 0,
    );
    // Validate avatar_url and bio are optional
    if (actor.avatar_url !== null && actor.avatar_url !== undefined) {
      TestValidator.equals(
        "banned actor has avatar_url type",
        typeof actor.avatar_url,
        "string",
      );
      TestValidator.predicate(
        "banned actor avatar_url is URL",
        actor.avatar_url.startsWith("http"),
      );
    }
    if (actor.bio !== null && actor.bio !== undefined) {
      TestValidator.equals(
        "banned actor has bio type",
        typeof actor.bio,
        "string",
      );
      TestValidator.predicate("banned actor bio length", actor.bio.length > 0);
    }
  });
  // 7. Test that deleted_at filter works by requesting null and a date
  // Null should return active bans, true/false should return deleted/not deleted
  // Test deleted bans (deleted_at: true)
  const deletedBansResponse =
    await api.functional.redditCommunity.communityOwner.communities.bans.index(
      ownerConnection,
      {
        communityId,
        body: {
          deleted_at: true, // true to get deleted bans
        } satisfies IRedditCommunityBanOfMember.IRequest,
      },
    );
  typia.assert(deletedBansResponse);
  // 8. Verify that unauthenticated request fails
  const unauthenticatedConnection: api.IConnection = { host: connection.host };
  await TestValidator.httpError(
    "unauthenticated access denied",
    403,
    async () => {
      await api.functional.redditCommunity.communityOwner.communities.bans.index(
        unauthenticatedConnection,
        {
          communityId,
          body: {
            deleted_at: null,
          } satisfies IRedditCommunityBanOfMember.IRequest,
        },
      );
    },
  );
}