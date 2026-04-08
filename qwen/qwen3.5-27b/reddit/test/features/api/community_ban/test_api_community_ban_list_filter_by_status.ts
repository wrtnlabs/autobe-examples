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
 * Test that a moderator can filter ban records by status (active vs removed) to view either current restrictions or historical bans.
 *
 * Validates the ban list filtering functionality by creating two ban records, removing one of them, and verifying that the status filter correctly returns only active bans, only removed bans, or all bans depending on the filter parameter.
 *
 * Special attention is given to verifying that the deleted_at field correctly distinguishes between active bans (null) and removed bans (timestamp set), and that pagination counts reflect the filtered results accurately.
 *
 * 1. Moderator registers and authenticates to gain access to moderation endpoints.
 * 2. Two member accounts (member1 and member2) are registered for banning.
 * 3. Ban records are created for both members in the community.
 * 4. One ban (member2) is removed by calling the delete ban endpoint.
 * 5. Ban list is queried with status='active' filter and verified to return only member1's ban.
 * 6. Ban list is queried with status='removed' filter and verified to return only member2's ban.
 * 7. Ban list is queried without status filter and verified to return both bans.
 * 8. Pagination counts are validated to match the filtered result counts.
 */
export async function test_api_community_ban_list_filter_by_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Moderator setup
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {});
  typia.assert(moderatorAuth);
  // 2. Member setup
  const member1Connection: api.IConnection = { host: connection.host };
  const member1Auth = await authorize_member_join(member1Connection, {});
  typia.assert(member1Auth);
  const member2Connection: api.IConnection = { host: connection.host };
  const member2Auth = await authorize_member_join(member2Connection, {});
  typia.assert(member2Auth);
  // 3. Community ID (using random UUID as community creation endpoint is not available)
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 4. Create ban for member1
  const ban1 =
    await api.functional.redditClone.moderator.communities.bans.create(
      moderatorConnection,
      {
        communityId,
        body: {
          ban_reason: "Violation of community rules - spam",
          reddit_clone_member_id: member1Auth.id,
        } satisfies IRedditCloneCommunityBan.ICreate,
      },
    );
  typia.assert(ban1);
  // 5. Create ban for member2
  const ban2 =
    await api.functional.redditClone.moderator.communities.bans.create(
      moderatorConnection,
      {
        communityId,
        body: {
          ban_reason: "Violation of community rules - harassment",
          reddit_clone_member_id: member2Auth.id,
        } satisfies IRedditCloneCommunityBan.ICreate,
      },
    );
  typia.assert(ban2);
  // 6. Remove ban for member2
  await api.functional.redditClone.moderator.communities.bans.erase(
    moderatorConnection,
    {
      communityId,
      banId: ban2.id,
    },
  );
  // 7. Test active filter
  const activeBans =
    await api.functional.redditClone.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "active",
        } satisfies IRedditCloneCommunityBan.IRequest,
      },
    );
  typia.assert(activeBans);
  TestValidator.equals("active ban count", activeBans.data.length, 1);
  TestValidator.equals("active ban is member1", activeBans.data[0].id, ban1.id);
  // 8. Test removed filter
  const removedBans =
    await api.functional.redditClone.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {
          status: "removed",
        } satisfies IRedditCloneCommunityBan.IRequest,
      },
    );
  typia.assert(removedBans);
  TestValidator.equals("removed ban count", removedBans.data.length, 1);
  TestValidator.equals(
    "removed ban is member2",
    removedBans.data[0].id,
    ban2.id,
  );
  // 9. Test no filter
  const allBans =
    await api.functional.redditClone.moderator.communities.bans.index(
      moderatorConnection,
      {
        communityId,
        body: {} satisfies IRedditCloneCommunityBan.IRequest,
      },
    );
  typia.assert(allBans);
  TestValidator.equals("total ban count", allBans.data.length, 2);
  // 10. Validate pagination counts
  TestValidator.equals(
    "active pagination records",
    activeBans.pagination.records,
    1,
  );
  TestValidator.equals(
    "removed pagination records",
    removedBans.pagination.records,
    1,
  );
  TestValidator.equals("all pagination records", allBans.pagination.records, 2);
}
