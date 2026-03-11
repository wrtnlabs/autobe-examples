import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformMemberSession } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMemberSession";
import type { IRedditPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPost";
import type { IRedditPlatformPostVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformPostVote";
import type { IRedditPlatformReport } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformReport";
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
import { generate_random_reddit_platform_admin_communities_bans_create } from "../../../generate/generate_random_reddit_platform_admin_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { generate_random_reddit_platform_member_communities_moderators_create } from "../../../generate/generate_random_reddit_platform_member_communities_moderators_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";
import { prepare_random_reddit_platform_community_moderator } from "../../../prepare/prepare_random_reddit_platform_community_moderator";

export async function test_api_community_ban_time_limited(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - create account
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminUsername = RandomGenerator.alphaNumeric(10);
  const adminPassword = RandomGenerator.alphaNumeric(12);
  const admin = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: adminEmail,
      username: adminUsername,
      password: adminPassword,
      display_name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() satisfies string & tags.Format<"uri">,
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // 2. Create a community using admin's session
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminJoinConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(8),
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 3. Create a member account to be banned
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberUsername = RandomGenerator.alphaNumeric(10);
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await authorize_member_join(memberJoinConnection, {
    body: {
      email: memberEmail,
      username: memberUsername,
      password: memberPassword,
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() satisfies string & tags.Format<"uri">,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(member);
  // 4. Admin login to grant moderator role
  const adminModeratorConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminModeratorConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // Grant admin moderator role for the community
  const moderator =
    await api.functional.redditPlatform.member.communities.moderators.create(
      adminModeratorConnection,
      {
        communityId: community.id,
        body: {
          user_id: admin.id,
        } satisfies IRedditPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderator);
  // 5. Admin login for ban operations
  const adminBanConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminBanConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 6. Create a time-limited ban with future expiration (5 minutes from now)
  const banExpirationTime = new Date();
  banExpirationTime.setMinutes(banExpirationTime.getMinutes() + 5);
  const expiresAt = banExpirationTime.toISOString();
  const ban = await api.functional.redditPlatform.admin.communities.bans.create(
    adminBanConnection,
    {
      communityId: community.id,
      body: {
        userId: member.id,
        expiresAt: expiresAt,
      } satisfies IRedditPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(ban);
  // 7. Verify ban record structure and expiration date
  TestValidator.equals("ban has correct expiration", ban.expiresAt, expiresAt);
  TestValidator.equals("ban user matches member", ban.author.id, member.id);
  TestValidator.equals("ban community matches", ban.community.id, community.id);
  TestValidator.equals("ban is active (not deleted)", ban.deletedAt, null);
  TestValidator.predicate(
    "ban expiration is in future",
    new Date(expiresAt) > new Date(),
  );
  // 8. Test immediate expiration (ban expires in past) - should still create ban
  const anotherMemberConnection: api.IConnection = { host: connection.host };
  const anotherMemberEmail = typia.random<string & tags.Format<"email">>();
  const anotherMember = await authorize_member_join(anotherMemberConnection, {
    body: {
      email: anotherMemberEmail,
      username: RandomGenerator.alphaNumeric(10),
      password: RandomGenerator.alphaNumeric(12),
      displayName: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string>() satisfies string & tags.Format<"uri">,
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(anotherMember);
  // Create ban with immediate expiration (already expired)
  const immediateExpireTime = new Date();
  immediateExpireTime.setMinutes(immediateExpireTime.getMinutes() - 1);
  const immediateExpiresAt = immediateExpireTime.toISOString();
  const immediateBan =
    await api.functional.redditPlatform.admin.communities.bans.create(
      adminBanConnection,
      {
        communityId: community.id,
        body: {
          userId: anotherMember.id,
          expiresAt: immediateExpiresAt,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(immediateBan);
  // 9. Validate that immediate expiration is recorded
  TestValidator.equals(
    "immediate ban has past expiration",
    immediateBan.expiresAt,
    immediateExpiresAt,
  );
  TestValidator.predicate(
    "immediate ban is recorded as expired",
    new Date(immediateExpiresAt) < new Date(),
  );
}
