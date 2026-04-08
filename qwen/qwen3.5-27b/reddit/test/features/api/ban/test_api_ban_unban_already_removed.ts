import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import type { IRedditCloneModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModerator";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";

/**
 * Test the idempotency protection when attempting to unban a user who has already been unbanned.
 *
 * Validates that the ban removal system correctly prevents duplicate unban operations on already-removed bans. The test creates a ban record, successfully unbans the user, then attempts to unban the same record again and verifies the system returns a conflict error.
 *
 * Special attention is given to ensuring the first unban operation succeeds and the second attempt properly fails with a 409 Conflict error, confirming the idempotency protection mechanism works correctly.
 *
 * 1. Moderator authenticates using the join endpoint.
 * 2. A ban record is created for a member in a community.
 * 3. The ban is successfully removed (unbanned) for the first time.
 * 4. Attempting to unban the same ban record again fails with a 409 Conflict error.
 */
export async function test_api_ban_unban_already_removed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup: Create moderator connection
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  // 2. Create a ban record
  const ban =
    await generate_random_reddit_clone_moderator_communities_bans_create(
      moderatorConnection,
      {
        body: {},
        params: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(ban);
  // 3. First unban - should succeed
  await api.functional.redditClone.moderator.communities.bans.erase(
    moderatorConnection,
    {
      communityId: ban.community.id,
      banId: ban.id,
    },
  );
  // 4. Second unban - should fail with 409 Conflict
  await TestValidator.httpError(
    "unban already removed ban returns 409",
    409,
    async () =>
      await api.functional.redditClone.moderator.communities.bans.erase(
        moderatorConnection,
        {
          communityId: ban.community.id,
          banId: ban.id,
        },
      ),
  );
}
