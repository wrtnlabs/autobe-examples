import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityBan";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileAssociation } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileAssociation";
import type { IRedditCloneMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMemberSession";
import type { IRedditCloneModeratorSnapshot } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneModeratorSnapshot";
import type { IRedditCloneUserKarma } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserKarma";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_clone_member_communities_bans_create } from "../../../generate/generate_random_reddit_clone_member_communities_bans_create";
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_moderator_snapshot } from "../../../prepare/prepare_random_reddit_clone_moderator_snapshot";
import { prepare_random_reddit_clone_user_karma } from "../../../prepare/prepare_random_reddit_clone_user_karma";

/**
 * Test that a community moderator can successfully update the reason and
 * expiration time of an existing ban. First, a member creates a community and
 * becomes the owner. Another member is added as a moderator. A third member is
 * banned from the community with a reason. The moderator then updates the ban's
 * reason to provide better documentation and sets an expiration timestamp for
 * a temporary ban. Verify the response contains the updated ban record with
 * the new reason and expiration time, while preserving the original banned
 * user, issuer, and creation timestamps.
 */
export async function test_api_ban_update_by_moderator(
  connection: api.IConnection,
): Promise<void> {
  // 1. Owner joins and creates a community
  const ownerConnection: api.IConnection = { host: connection.host };
  const ownerSession = await authorize_member_join(ownerConnection, {});
  typia.assert(ownerSession);
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  typia.assert(community);
  // 2. Moderator joins
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorSession = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorSession);
  // 3. Owner appoints moderator
  await generate_random_reddit_clone_member_communities_moderators_create(
    ownerConnection,
    {
      params: { communityName: community.name },
    },
  );
  // 4. Banned member joins
  const bannedConnection: api.IConnection = { host: connection.host };
  const bannedSession = await authorize_member_join(bannedConnection, {});
  typia.assert(bannedSession);
  // 5. Owner creates initial ban
  const initialReason = "Spamming links";
  const ban = await generate_random_reddit_clone_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: {
        bannedUsername: bannedSession.username,
        reason: initialReason,
      },
    },
  );
  typia.assert(ban);
  TestValidator.equals("initial reason preserved", ban.reason, initialReason);
  TestValidator.equals(
    "banned user preserved",
    ban.bannedUser.username,
    bannedSession.username,
  );
  TestValidator.equals(
    "issuer preserved",
    ban.issuer.username,
    ownerSession.username,
  );
  // 6. Moderator updates the ban
  const updatedReason = "Repeated spamming despite warnings - temporary ban";
  const expirationDate = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString();
  const updatedBan =
    await api.functional.redditClone.member.communities.bans.update(
      moderatorConnection,
      {
        communityName: community.name,
        banId: ban.id,
        body: {
          reason: updatedReason,
          expires_at: expirationDate,
        } satisfies IRedditCloneUserKarma.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 7. Verify updated ban
  TestValidator.equals("reason updated", updatedBan.reason, updatedReason);
  TestValidator.equals("expiration set", updatedBan.expires_at, expirationDate);
  TestValidator.equals(
    "banned user still same",
    updatedBan.bannedUser.username,
    bannedSession.username,
  );
  TestValidator.equals(
    "issuer still same",
    updatedBan.issuer.username,
    ownerSession.username,
  );
  TestValidator.equals(
    "community preserved",
    updatedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "creation timestamp preserved",
    updatedBan.created_at,
    ban.created_at,
  );
  TestValidator.predicate(
    "updated_at is after original",
    new Date(updatedBan.updated_at) > new Date(ban.updated_at),
  );
}
