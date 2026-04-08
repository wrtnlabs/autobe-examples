import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIRedditCloneCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIRedditCloneCommunityBan";
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

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_reddit_clone_moderator_communities_bans_create } from "../../../generate/generate_random_reddit_clone_moderator_communities_bans_create";
import { prepare_random_reddit_clone_community_ban } from "../../../prepare/prepare_random_reddit_clone_community_ban";

/**
 * Test that a moderator can retrieve a paginated list of active bans in their community.
 *
 * Validates the complete community ban listing workflow including moderator authentication, member registration, ban creation, and active ban retrieval. Ensures that the ban list endpoint correctly filters by status and returns paginated results with all required ban details.
 *
 * Special attention is given to verifying that active bans (deleted_at is null) are correctly filtered and that the response includes complete information about the banned member, banning moderator, and community context.
 *
 * 1. Moderator registers and authenticates with email, password, and display name.
 * 2. Member registers with email, password, and username to be banned.
 * 3. Moderator creates a ban record for the member in a community with a ban reason.
 * 4. Moderator retrieves the list of active bans filtered by status='active'.
 * 5. Validates that the response contains the created ban with deleted_at as null.
 * 6. Validates pagination metadata and all ban details are correctly included.
 */
export async function test_api_community_ban_list_active_bans(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator registration and authentication
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
    body: {},
  });
  typia.assert(moderator);
  // 2. Member registration (to be banned)
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {},
  });
  typia.assert(member);
  // 3. Create a ban record for the member
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const ban =
    await generate_random_reddit_clone_moderator_communities_bans_create(
      moderatorConnection,
      {
        params: {
          communityId,
        },
        body: {
          reddit_clone_member_id: member.id,
          ban_reason: "Violated community rules",
        },
      },
    );
  typia.assert(ban);
  // 4. Retrieve the list of active bans
  const banList =
    await api.functional.redditClone.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "active",
          page: 1,
          limit: 20,
        },
      },
    );
  typia.assert(banList);
  // 5. Validate pagination metadata
  TestValidator.equals("current page is 1", banList.pagination.current, 1);
  TestValidator.equals("limit is 20", banList.pagination.limit, 20);
  TestValidator.predicate(
    "has at least one ban",
    banList.pagination.records >= 1,
  );
  TestValidator.predicate(
    "pages count is valid",
    banList.pagination.pages >= 1,
  );
  // 6. Validate data array contains the created ban
  TestValidator.predicate("data array is not empty", banList.data.length > 0);
  const foundBan = banList.data.find(
    (b) => b.id === ban.id && b.bannedMember.id === member.id,
  );
  TestValidator.predicate(
    "found the created ban in list",
    foundBan !== undefined,
  );
  if (foundBan !== undefined) {
    // 7. Validate ban details
    TestValidator.equals(
      "ban reason matches",
      foundBan.ban_reason,
      ban.banReason,
    );
    TestValidator.equals(
      "created_at matches",
      foundBan.created_at,
      ban.createdAt,
    );
    TestValidator.equals(
      "expires_at matches",
      foundBan.expires_at,
      ban.expiresAt,
    );
    // 8. Validate active ban status (deleted_at is null)
    TestValidator.equals(
      "deleted_at is null for active ban",
      foundBan.deleted_at,
      null,
    );
    // 9. Validate banned member information
    TestValidator.equals(
      "banned member id matches",
      foundBan.bannedMember.id,
      member.id,
    );
    TestValidator.equals(
      "banned member username matches",
      foundBan.bannedMember.username,
      member.username,
    );
    // 10. Validate banning moderator information
    TestValidator.equals(
      "banning moderator id matches",
      foundBan.banningModerator.id,
      moderator.id,
    );
    TestValidator.equals(
      "banning moderator email matches",
      foundBan.banningModerator.email,
      moderator.email,
    );
    // 11. Validate community information
    TestValidator.equals(
      "community id matches",
      foundBan.community.id,
      communityId,
    );
  }
}
