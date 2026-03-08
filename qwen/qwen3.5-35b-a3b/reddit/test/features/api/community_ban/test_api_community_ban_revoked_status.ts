import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunitySubscription } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunitySubscription";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_community_ban_revoked_status(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create moderator account and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_member_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "moderator123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(moderator);
  // 2. Create community as moderator
  const community =
    await api.functional.redditPlatform.member.communities.create(
      moderatorConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<3> &
              tags.MaxLength<20> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: "Test community for revoked ban scenario",
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create member account to be banned
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: typia.random<
        string &
          tags.MinLength<3> &
          tags.MaxLength<20> &
          tags.Pattern<"^[a-zA-Z0-9_]+$">
      >(),
      password: "member123",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 4. Ban the member from the community (moderator only)
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          user_id: member.id,
          expires_at: new Date(
            Date.now() + 7 * 24 * 60 * 60 * 1000,
          ).toISOString(), // 7 days from now
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Verify ban is initially active
  TestValidator.predicate("initial ban is active", ban.isActive === true);
  TestValidator.equals("deleted_at is null initially", ban.deleted_at, null);
  // Wait a moment to ensure distinct timestamps for duration calculation
  await new Promise((resolve) => setTimeout(resolve, 100));
  // 5. Unban the member by deleting the ban record
  await api.functional.redditPlatform.member.communities.bans.erase(
    moderatorConnection,
    {
      communityId: community.id,
      banId: ban.id,
    },
  );
  // 6. Retrieve the ban record by banId
  const retrievedBan = await api.functional.redditPlatform.member.bans.at(
    moderatorConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 7. Validate revoked ban properties
  TestValidator.equals(
    "revoked ban isActive is false",
    retrievedBan.isActive,
    false,
  );
  TestValidator.notEquals(
    "revoked ban has non-null deleted_at",
    retrievedBan.deleted_at,
    null,
  );
  TestValidator.equals(
    "revoked ban isPermanent preserved",
    retrievedBan.isPermanent,
    ban.isPermanent,
  );
  TestValidator.notEquals(
    "revoked ban has durationDays",
    retrievedBan.durationDays,
    null,
  );
  TestValidator.equals(
    "revoked ban community preserved",
    retrievedBan.community.id,
    community.id,
  );
  TestValidator.equals(
    "revoked ban bannedUser preserved",
    retrievedBan.bannedUser.id,
    member.id,
  );
  TestValidator.equals(
    "revoked ban bannedBy preserved",
    retrievedBan.bannedBy.id,
    moderator.id,
  );
  // 8. Verify duration is calculated correctly (time from created_at to deleted_at)
  const banDuration = retrievedBan.durationDays;
  TestValidator.predicate(
    "durationDays is positive",
    banDuration !== null && banDuration > 0,
  );
  // 9. Verify related entities are intact for audit trail
  TestValidator.notEquals(
    "community is intact",
    retrievedBan.community,
    undefined,
  );
  TestValidator.notEquals(
    "bannedUser is intact",
    retrievedBan.bannedUser,
    undefined,
  );
  TestValidator.notEquals(
    "bannedBy is intact",
    retrievedBan.bannedBy,
    undefined,
  );
}
