import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityBan";
import type { ICommunityComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityComment";
import type { ICommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityCommunity";
import type { ICommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityMember";
import type { ICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerationLog";
import type { ICommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityModerator";
import type { ICommunityPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPost";
import type { ICommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunitySubscription";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityModerationLog } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityModerationLog";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_community_member_communities_bans_create } from "../../../generate/generate_random_community_member_communities_bans_create";
import { generate_random_community_member_communities_create } from "../../../generate/generate_random_community_member_communities_create";
import { generate_random_community_member_communities_moderators_create } from "../../../generate/generate_random_community_member_communities_moderators_create";
import { prepare_random_community_ban } from "../../../prepare/prepare_random_community_ban";
import { prepare_random_community_community } from "../../../prepare/prepare_random_community_community";
import { prepare_random_community_moderator } from "../../../prepare/prepare_random_community_moderator";

/**
 * Test that a community owner can successfully retrieve the complete moderation
 * audit trail for their community. The owner creates a community (automatically
 * becoming owner), adds a moderator, and bans a user to generate log entries of
 * different action types (MODERATOR_ADDED, USER_BANNED). When the owner queries
 * the moderation logs endpoint without filters, the response should contain all
 * log entries sorted by created_at DESC, each including the actor (moderator who
 * performed the action), action_type, optional reason, timestamp, and target
 * reference (member for MODERATOR_ADDED and USER_BANNED actions). Validate that
 * the pagination structure returns correct current page, limit, total records
 * count, and total pages. Verify each log entry correctly resolves the target
 * member reference with their profile information.
 */
export async function test_api_moderation_logs_owner_access(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as community owner
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {});
  typia.assert(owner);
  // 2. Owner creates a community (automatically becomes moderator with is_owner=true)
  const community = await generate_random_community_member_communities_create(
    ownerConnection,
    {},
  );
  typia.assert(community);
  // 3. Authenticate as a second member who will be appointed as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorMember = await authorize_member_join(moderatorConnection, {});
  typia.assert(moderatorMember);
  // 4. Subscribe the second member to the community (prerequisite for moderator appointment)
  const subscription =
    await api.functional.community.member.communities.subscribe(
      moderatorConnection,
      { communityName: community.name },
    );
  typia.assert(subscription);
  // 5. Owner appoints the second member as moderator, creating MODERATOR_ADDED log entry
  const moderatorRecord =
    await generate_random_community_member_communities_moderators_create(
      ownerConnection,
      {
        params: { communityName: community.name },
        body: {
          member_username: moderatorMember.username,
        } satisfies ICommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorRecord);
  // 6. Authenticate as a third member who will be banned
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const bannedMember = await authorize_member_join(bannedMemberConnection, {});
  typia.assert(bannedMember);
  // 7. Subscribe the third member to the community (required before banning)
  const bannedSubscription =
    await api.functional.community.member.communities.subscribe(
      bannedMemberConnection,
      { communityName: community.name },
    );
  typia.assert(bannedSubscription);
  // 8. Owner bans the third member, creating USER_BANNED log entry with reason
  const banReason = RandomGenerator.paragraph({ sentences: 2 });
  const ban = await generate_random_community_member_communities_bans_create(
    ownerConnection,
    {
      params: { communityName: community.name },
      body: {
        username: bannedMember.username,
        reason: banReason,
      } satisfies ICommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // 9. Owner queries moderation logs without filters
  const logs =
    await api.functional.community.member.communities.moderationLogs.index(
      ownerConnection,
      {
        communityName: community.name,
        body: {} satisfies ICommunityModerationLog.IRequest,
      },
    );
  typia.assert(logs);
  // 10. Validate pagination structure
  TestValidator.predicate(
    "pagination current page is 1",
    logs.pagination.current === 1,
  );
  TestValidator.predicate(
    "pagination limit is positive",
    logs.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination records is at least 2",
    logs.pagination.records >= 2,
  );
  TestValidator.predicate(
    "pagination pages is at least 1",
    logs.pagination.pages >= 1,
  );
  // 11. Validate log entries exist and are sorted by created_at DESC
  TestValidator.predicate("log entries found", logs.data.length >= 2);
  // 12. Validate logs are sorted by created_at DESC (most recent first)
  for (let i = 0; i < logs.data.length - 1; i++) {
    const current = new Date(logs.data[i].createdAt).getTime();
    const next = new Date(logs.data[i + 1].createdAt).getTime();
    TestValidator.predicate(
      `logs sorted by created_at DESC at index ${i}`,
      current >= next,
    );
  }
  // 13. Find and validate MODERATOR_ADDED log entry
  const moderatorAddedLog = logs.data.find(
    (log) => log.actionType === "MODERATOR_ADDED",
  );
  TestValidator.predicate(
    "MODERATOR_ADDED log entry exists",
    moderatorAddedLog !== undefined,
  );
  if (moderatorAddedLog !== undefined) {
    TestValidator.equals(
      "MODERATOR_ADDED actor is owner",
      moderatorAddedLog.actor.id,
      owner.id,
    );
    TestValidator.equals(
      "MODERATOR_ADDED community matches",
      moderatorAddedLog.community.id,
      community.id,
    );
    TestValidator.predicate(
      "MODERATOR_ADDED has target member",
      moderatorAddedLog.targetMember !== null,
    );
    if (moderatorAddedLog.targetMember !== null) {
      TestValidator.equals(
        "MODERATOR_ADDED target member is moderator",
        moderatorAddedLog.targetMember.id,
        moderatorMember.id,
      );
    }
    TestValidator.predicate(
      "MODERATOR_ADDED target post is null",
      moderatorAddedLog.targetPost === null,
    );
    TestValidator.predicate(
      "MODERATOR_ADDED target comment is null",
      moderatorAddedLog.targetComment === null,
    );
  }
  // 14. Find and validate USER_BANNED log entry
  const userBannedLog = logs.data.find(
    (log) => log.actionType === "USER_BANNED",
  );
  TestValidator.predicate(
    "USER_BANNED log entry exists",
    userBannedLog !== undefined,
  );
  if (userBannedLog !== undefined) {
    TestValidator.equals(
      "USER_BANNED actor is owner",
      userBannedLog.actor.id,
      owner.id,
    );
    TestValidator.equals(
      "USER_BANNED community matches",
      userBannedLog.community.id,
      community.id,
    );
    TestValidator.equals(
      "USER_BANNED reason matches",
      userBannedLog.reason,
      banReason,
    );
    TestValidator.predicate(
      "USER_BANNED has target member",
      userBannedLog.targetMember !== null,
    );
    if (userBannedLog.targetMember !== null) {
      TestValidator.equals(
        "USER_BANNED target member is banned user",
        userBannedLog.targetMember.id,
        bannedMember.id,
      );
    }
    TestValidator.predicate(
      "USER_BANNED target post is null",
      userBannedLog.targetPost === null,
    );
    TestValidator.predicate(
      "USER_BANNED target comment is null",
      userBannedLog.targetComment === null,
    );
  }
  // 15. Validate each log entry has required fields
  for (const log of logs.data) {
    TestValidator.predicate(
      `log ${log.id} has valid id`,
      typia.is<string & typia.tags.Format<"uuid">>(log.id),
    );
    TestValidator.predicate(
      `log ${log.id} has actionType`,
      typeof log.actionType === "string" && log.actionType.length > 0,
    );
    TestValidator.predicate(
      `log ${log.id} has actor`,
      log.actor !== null && log.actor !== undefined,
    );
    TestValidator.predicate(
      `log ${log.id} has community`,
      log.community !== null && log.community !== undefined,
    );
    TestValidator.predicate(
      `log ${log.id} has createdAt`,
      typeof log.createdAt === "string",
    );
  }
}
