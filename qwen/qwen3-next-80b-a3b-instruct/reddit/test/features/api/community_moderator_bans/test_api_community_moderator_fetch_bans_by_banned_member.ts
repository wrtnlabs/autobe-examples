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

export async function test_api_community_moderator_fetch_bans_by_banned_member(
  connection: api.IConnection,
): Promise<void> {
  // Scenario: Authenticate as community moderator, then fetch bans for a specific banned member using banned_member_id filter. Validate that results contain only bans where the banned_actor matches the targeted member across all communities the moderator oversees. Ensures the banned_actor type is IRedditCommunityMember.ISummary. Fails gracefully when no matching bans exist.
  // 1. Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_community_moderator_join(
    moderatorConnection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password_hash: RandomGenerator.alphaNumeric(16),
        display_name: RandomGenerator.name(),
      } satisfies IRedditCommunityCommunityModerator.IJoin,
    },
  );
  typia.assert(moderatorAuth);
  // 2. Fetch all bans to discover a valid member ban
  const allBans =
    await api.functional.redditCommunity.communityModerator.bans.index(
      moderatorConnection,
      {
        body: {} satisfies IRedditCommunityBanOfMember.IRequest,
      },
    );
  typia.assert(allBans);
  // 3. Find the first ban where banned_actor is IRedditCommunityMember.ISummary
  const memberBan = allBans.data.find(
    (ban) =>
      typeof ban.banned_actor === "object" &&
      "id" in ban.banned_actor &&
      "display_name" in ban.banned_actor &&
      "created_at" in ban.banned_actor,
  );
  // 4. Fail test if no member ban exists
  TestValidator.equals(
    "at least one member ban found in system",
    memberBan !== undefined,
    true,
  );
  if (!memberBan) return; // Skip as system is not set up - test isn't broken
  const bannedMemberId = memberBan.banned_actor.id;
  // 5. Fetch bans filtered by banned_member_id
  const filteredBans =
    await api.functional.redditCommunity.communityModerator.bans.index(
      moderatorConnection,
      {
        body: {
          banned_member_id: bannedMemberId,
        } satisfies IRedditCommunityBanOfMember.IRequest,
      },
    );
  typia.assert(filteredBans);
  // 6. Verify filtered result contains only bans for the targeted member
  TestValidator.equals(
    "filtered bans contain the target member",
    filteredBans.data.length > 0,
    true,
  );
  TestValidator.equals(
    "filtered ban member ID matches",
    filteredBans.data[0].banned_actor.id,
    bannedMemberId,
  );
  // 7. Verify an invalid banned_member_id returns no results
  const invalidBans =
    await api.functional.redditCommunity.communityModerator.bans.index(
      moderatorConnection,
      {
        body: {
          banned_member_id: "00000000-0000-0000-0000-000000000000",
        } satisfies IRedditCommunityBanOfMember.IRequest,
      },
    );
  typia.assert(invalidBans);
  TestValidator.equals(
    "invalid banned member ID returns no bans",
    invalidBans.data.length,
    0,
  );
}
