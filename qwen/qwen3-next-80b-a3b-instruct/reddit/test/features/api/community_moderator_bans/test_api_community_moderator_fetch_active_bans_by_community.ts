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

import { authorize_community_moderator_join } from "../../../authorize/authorize_community_moderator_join";
import { authorize_community_moderator_login } from "../../../authorize/authorize_community_moderator_login";
import { authorize_community_moderator_refresh } from "../../../authorize/authorize_community_moderator_refresh";

export async function test_api_community_moderator_fetch_active_bans_by_community(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const authResponse = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  moderatorConnection.headers = {
    Authorization: `Bearer ${authResponse.access_token}`,
  };
  // 2. Fetch active bans for a community (using community_id filter)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const bansResponse =
    await api.functional.redditCommunity.communityModerator.bans.index(
      moderatorConnection,
      {
        body: {
          community_id: communityId,
          deleted_at: null,
        } satisfies IRedditCommunityBanOfMember.IRequest,
      },
    );
  typia.assert(bansResponse);
  // 3. Validate response structure
  TestValidator.equals(
    "pagination.current should be >= 1",
    bansResponse.pagination.current >= 1,
    true,
  );
  TestValidator.equals(
    "pagination.limit should be > 0",
    bansResponse.pagination.limit > 0,
    true,
  );
  TestValidator.equals(
    "pagination.records should be >= 0",
    bansResponse.pagination.records >= 0,
    true,
  );
  TestValidator.equals(
    "pagination.pages should be >= 0",
    bansResponse.pagination.pages >= 0,
    true,
  );
  TestValidator.predicate(
    "data should be array",
    Array.isArray(bansResponse.data),
  );
  // Validate each ban item structure
  for (const ban of bansResponse.data) {
    TestValidator.equals("ban.id should be UUID", typeof ban.id, "string");
    TestValidator.predicate(
      "ban.reason should be string",
      typeof ban.reason === "string",
    );
    // Validate moderator summary
    TestValidator.equals(
      "ban.moderator.id should be UUID",
      typeof ban.moderator.id,
      "string",
    );
    TestValidator.predicate(
      "ban.moderator.display_name should be string",
      typeof ban.moderator.display_name === "string",
    );
    // Validate community summary
    TestValidator.equals(
      "ban.community.id should be UUID",
      typeof ban.community.id,
      "string",
    );
    TestValidator.predicate(
      "ban.community.name should be string",
      typeof ban.community.name === "string",
    );
    // Validate banned_actor is one of the three possible types
    TestValidator.predicate(
      "banned_actor is not null and has id",
      ban.banned_actor !== null && typeof ban.banned_actor.id === "string",
    );
    TestValidator.predicate(
      "banned_actor has display_name",
      typeof ban.banned_actor.display_name === "string",
    );
    // Handle banned_actor union type safety
    if (ban.banned_actor !== null) {
      typia.assertGuard<
        | IRedditCommunityCommunityModerator.ISummary
        | IRedditCommunityCommunityOwner.ISummary
        | IRedditCommunityMember.ISummary
      >(ban.banned_actor);
      // Only validate created_at if it exists in this specific instance
      if (
        "created_at" in ban.banned_actor &&
        ban.banned_actor.created_at !== undefined
      ) {
        TestValidator.predicate(
          "banned_actor created_at is date-time",
          /^\[0-9]{4}-[0-9]{2}-[0-9]{2}T[0-9]{2}:[0-9]{2}:[0-9]{2}(?:\[0-9]{1,9})?(?:Z|[+-][0-9]{2}:[0-9]{2})$/i.test(
            ban.banned_actor.created_at,
          ),
        );
      }
      // Validate common structure across all three types
      TestValidator.predicate(
        "banned_actor has expected structure",
        typeof ban.banned_actor.id === "string" &&
          typeof ban.banned_actor.display_name === "string" &&
          (ban.banned_actor.bio === undefined ||
            ban.banned_actor.bio === null ||
            typeof ban.banned_actor.bio === "string") &&
          (ban.banned_actor.avatar_url === undefined ||
            ban.banned_actor.avatar_url === null ||
            typeof ban.banned_actor.avatar_url === "string"),
      );
    }
  }
}
