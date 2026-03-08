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

export async function test_api_ban_retrieval_active(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create and authenticate first member (community owner)
  const ownerConnection: api.IConnection = { host: connection.host };
  const owner = await authorize_member_join(ownerConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(owner);
  // Step 2: Create and authenticate second member (user to be banned)
  const userToBanConnection: api.IConnection = { host: connection.host };
  const userToBan = await authorize_member_join(userToBanConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(userToBan);
  // Step 3: Authenticate admin
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(admin);
  // Step 4: Owner creates a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerConnection,
      {
        body: {
          name: RandomGenerator.alphabets(12),
          description: RandomGenerator.paragraph({ sentences: 2 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // Step 5: Owner bans the second member
  const ban =
    await api.functional.redditPlatform.member.communities.bans.create(
      ownerConnection,
      {
        communityId: community.id,
        body: {
          user_id: userToBan.id,
          expires_at: null, // Permanent ban
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Step 6: Admin retrieves the ban record
  const retrievedBan = await api.functional.redditPlatform.admin.bans.at(
    adminConnection,
    {
      banId: ban.id,
    },
  );
  typia.assert(retrievedBan);
  // Step 7: Validate ban is active with correct fields
  TestValidator.equals("isActive should be true", retrievedBan.isActive, true);
  TestValidator.equals(
    "isPermanent should be true",
    retrievedBan.isPermanent,
    true,
  );
  TestValidator.equals(
    "deleted_at should be null",
    retrievedBan.deleted_at,
    null,
  );
  TestValidator.equals(
    "expires_at should be null",
    retrievedBan.expires_at,
    null,
  );
  TestValidator.equals(
    "durationDays should be null",
    retrievedBan.durationDays,
    null,
  );
  TestValidator.equals(
    "bannedUser username matches",
    retrievedBan.bannedUser.username,
    userToBan.username,
  );
  TestValidator.equals(
    "bannedUser displayName matches",
    retrievedBan.bannedUser.displayName,
    userToBan.displayName,
  );
  TestValidator.equals(
    "bannedBy username matches owner",
    retrievedBan.bannedBy.username,
    owner.username,
  );
  TestValidator.equals(
    "bannedBy displayName matches owner",
    retrievedBan.bannedBy.displayName,
    owner.displayName,
  );
  TestValidator.equals(
    "community name matches",
    retrievedBan.community.name,
    community.name,
  );
  // Validate timestamps
  const createdDate = new Date(retrievedBan.created_at);
  const now = new Date();
  const timeDiff = now.getTime() - createdDate.getTime();
  const oneHour = 60 * 60 * 1000;
  TestValidator.predicate(
    "created_at should be recent (within 1 hour)",
    timeDiff > 0 && timeDiff < oneHour,
  );
}