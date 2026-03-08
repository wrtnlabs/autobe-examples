import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
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

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_member } from "../../../prepare/prepare_random_reddit_platform_member";

export async function test_api_ban_retrieval_expired(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - authenticate as admin
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: "admin@test.com",
      password: "1234",
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Member setup - authenticate member who will create ban
  const memberConnection: api.IConnection = { host: connection.host };
  const memberJoinResult = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(8),
      password: "1234",
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(memberJoinResult);
  // 3. Create community (member becomes owner)
  const community =
    await api.functional.redditPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: typia.random<
            string &
              tags.MinLength<1> &
              tags.MaxLength<30> &
              tags.Pattern<"^[a-zA-Z0-9_]+$">
          >(),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: typia.random<string & tags.Format<"uri">>() ?? null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Create expired ban - ban with expiration date in the past
  const pastExpiration = new Date();
  pastExpiration.setDate(pastExpiration.getDate() - 1); // 1 day ago
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      memberConnection,
      {
        communityId: community.id,
        body: {
          user_id: memberJoinResult.id,
          expires_at: pastExpiration.toISOString(),
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // 5. Retrieve the ban record using admin connection
  const retrievedBan = await api.functional.redditPlatform.admin.bans.at(
    adminConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // 6. Validate ban record
  // isActive should be false because expires_at is in the past
  TestValidator.equals("isActive is false", retrievedBan.isActive, false);
  // isPermanent should be false because we set expires_at
  TestValidator.equals("isPermanent is false", retrievedBan.isPermanent, false);
  // durationDays should be 1 (1 day ban)
  TestValidator.equals("durationDays is 1", retrievedBan.durationDays, 1);
  // expiresAt should show the past expiration timestamp
  const expectedExpiresAt = pastExpiration.toISOString();
  TestValidator.equals(
    "expiresAt matches past date",
    retrievedBan.expires_at,
    expectedExpiresAt,
  );
  // deletedAt should be null (not manually revoked, just expired)
  TestValidator.equals("deletedAt is null", retrievedBan.deleted_at, null);
  // Verify community details are resolved
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  TestValidator.equals(
    "community owner matches",
    retrievedBan.community.author.id,
    community.owner.id,
  );
  // Verify banned user details are resolved
  TestValidator.equals(
    "banned user ID matches",
    retrievedBan.bannedUser.id,
    memberJoinResult.id,
  );
  TestValidator.equals(
    "banned user username matches",
    retrievedBan.bannedUser.username,
    memberJoinResult.username,
  );
  // Verify bannedBy details (should be the member who created the ban - community owner)
  TestValidator.equals(
    "bannedBy ID matches",
    retrievedBan.bannedBy.id,
    community.owner.id,
  );
}
