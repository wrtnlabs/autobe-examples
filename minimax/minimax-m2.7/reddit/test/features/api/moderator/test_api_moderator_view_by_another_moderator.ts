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
import { generate_random_reddit_clone_member_communities_create } from "../../../generate/generate_random_reddit_clone_member_communities_create";
import { generate_random_reddit_clone_member_communities_moderators_create } from "../../../generate/generate_random_reddit_clone_member_communities_moderators_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";
import { prepare_random_reddit_clone_moderator_snapshot } from "../../../prepare/prepare_random_reddit_clone_moderator_snapshot";

/**
 * Test that an existing moderator can view another moderator's details within the same community.
 *
 * Scenario steps:
 * 1. First member creates a community (becomes owner)
 * 2. Second member joins and gets appointed as first moderator by the owner
 * 3. Third member joins and gets appointed as second moderator by the owner
 * 4. Third moderator (authenticated) calls GET /communities/{communityName}/moderators/{secondModeratorId}
 * 5. Verify response returns 200 with moderator details including role, member info, and timestamps
 */
export async function test_api_moderator_view_by_another_moderator(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: First member creates community (becomes owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  const community =
    await generate_random_reddit_clone_member_communities_create(
      ownerConnection,
      {},
    );
  // Step 2: Second member joins and gets appointed as first moderator
  const mod1Connection: api.IConnection = { host: connection.host };
  const mod1 = await authorize_member_join(mod1Connection, {});
  const moderator1 =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { memberUsername: mod1.username },
      },
    );
  typia.assert(moderator1);
  // Step 3: Third member joins and gets appointed as second moderator
  const mod2Connection: api.IConnection = { host: connection.host };
  const mod2 = await authorize_member_join(mod2Connection, {});
  const moderator2 =
    await generate_random_reddit_clone_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: { memberUsername: mod2.username },
      },
    );
  typia.assert(moderator2);
  // Step 4: Third moderator (mod2) views second moderator's (mod1) details
  const viewedModerator =
    await api.functional.redditClone.communities.moderators.at(mod2Connection, {
      communityName: community.name,
      moderatorId: moderator1.id,
    });
  typia.assert(viewedModerator);
  // Step 5: Verify response contains valid moderator details
  TestValidator.equals(
    "moderator id matches",
    viewedModerator.id,
    moderator1.id,
  );
  TestValidator.equals("role is moderator", viewedModerator.role, "moderator");
  TestValidator.equals(
    "member username matches",
    viewedModerator.member.username,
    mod1.username,
  );
  TestValidator.equals("member id matches", viewedModerator.member.id, mod1.id);
  TestValidator.equals(
    "community name matches",
    viewedModerator.community.name,
    community.name,
  );
  TestValidator.predicate(
    "created_at is valid ISO timestamp",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(viewedModerator.created_at),
  );
  TestValidator.equals(
    "deleted_at is null (active)",
    viewedModerator.deleted_at,
    null,
  );
}
