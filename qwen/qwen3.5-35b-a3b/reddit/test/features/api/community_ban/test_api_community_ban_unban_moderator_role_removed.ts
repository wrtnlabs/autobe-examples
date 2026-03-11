import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformComment";
import type { IRedditPlatformCommentVote } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommentVote";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityBan";
import type { IRedditPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModerator";
import type { IRedditPlatformCommunityModeratorDetail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityModeratorDetail";
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
import { generate_random_reddit_platform_member_communities_bans_create } from "../../../generate/generate_random_reddit_platform_member_communities_bans_create";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_community_ban } from "../../../prepare/prepare_random_reddit_platform_community_ban";

export async function test_api_community_ban_unban_moderator_role_removed(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin joins and logs in
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const adminJoinConnection: api.IConnection = { host: connection.host };
  const adminJoinResult = await authorize_admin_join(adminJoinConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphaNumeric(12),
      password: adminPassword,
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    },
  });
  typia.assert(adminJoinResult);
  const adminConnection: api.IConnection = { host: connection.host };
  await authorize_admin_login(adminConnection, {
    body: {
      email: adminJoinResult.email,
      password: adminPassword,
    } satisfies IRedditPlatformAdmin.ILogin,
  });
  // 2. Member joins and logs in
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const memberJoinConnection: api.IConnection = { host: connection.host };
  const memberJoinResultRaw = await authorize_member_join(
    memberJoinConnection,
    {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(10),
        password: memberPassword,
        displayName: RandomGenerator.name(1),
        bio: RandomGenerator.paragraph({ sentences: 2 }),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
        ip: typia.random<string & tags.Format<"ipv4">>(),
      },
    },
  );
  const memberJoinResult: IRedditPlatformMember.IAuthorized =
    typia.assert<IRedditPlatformMember.IAuthorized>(memberJoinResultRaw);
  const memberConnection: api.IConnection = { host: connection.host };
  await authorize_member_login(memberConnection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies IRedditPlatformMember.ILogin,
  });
  // 3. Admin creates a community
  const community =
    await api.functional.redditPlatform.member.communities.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.alphaNumeric(15),
          description: RandomGenerator.paragraph({ sentences: 1 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Admin adds member as moderator
  const moderatorList =
    await api.functional.redditPlatform.member.communities.moderators.assignModerators(
      adminConnection,
      {
        communityId: community.id,
        body: {
          actionType: "ADD",
          targetUserId: memberJoinResult.id,
          notes: "Granting moderator privileges for testing",
        } satisfies IRedditPlatformCommunityModerator.IAssignment,
      },
    );
  typia.assert(moderatorList);
  // Verify member is now a moderator
  TestValidator.equals(
    "member is in moderator list",
    moderatorList.moderators?.some((m) => m.user.id === memberJoinResult.id),
    true,
  );
  const moderatorRecord = moderatorList.moderators?.find(
    (m) => m.user.id === memberJoinResult.id,
  );
  typia.assert(
    moderatorRecord,
    () =>
      new Error(
        `Expected moderator record to exist for user ${memberJoinResult.id}`,
      ),
  );
  const moderatorId = moderatorRecord!.id;
  // 5. Admin bans the moderator
  const banRecord =
    await api.functional.redditPlatform.member.communities.bans.create(
      adminConnection,
      {
        communityId: community.id,
        body: {
          userId: memberJoinResult.id,
          expiresAt: null,
        } satisfies IRedditPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // Verify ban is active (deletedAt should be null)
  TestValidator.equals("ban is initially active", banRecord.deletedAt, null);
  const banId = banRecord.id;
  // 6. Admin performs unban operation
  const unbanRecord =
    await api.functional.redditPlatform.admin.communities.bans.putByCommunityidAndBanid(
      adminConnection,
      {
        communityId: community.id,
        banId: banId,
        body: {
          unbanReason: "User completed probation period",
        } satisfies IRedditPlatformCommunityBan.IUnban,
      },
    );
  typia.assert(unbanRecord);
  // 7. Verify ban record is updated with deletedAt timestamp
  TestValidator.equals(
    "ban has deletedAt set after unban",
    unbanRecord.deletedAt !== null,
    true,
  );
  // 8. Verify user's moderator role is removed from the community
  const updatedModeratorList =
    await api.functional.redditPlatform.member.communities.moderators.assignModerators(
      adminConnection,
      {
        communityId: community.id,
        body: {
          actionType: "ADD",
          targetUserId: memberJoinResult.id,
          notes: "Checking if member still in moderator list",
        } satisfies IRedditPlatformCommunityModerator.IAssignment,
      },
    );
  typia.assert(updatedModeratorList);
  // Verify member is no longer in moderator list
  const memberStillModerator = updatedModeratorList.moderators?.some(
    (m) => m.user.id === memberJoinResult.id,
  );
  TestValidator.equals(
    "member removed from moderator list after unban",
    memberStillModerator,
    false,
  );
  // Verify the moderator record itself is removed
  const moderatorRecordStillExists = updatedModeratorList.moderators?.some(
    (m) => m.id === moderatorId,
  );
  TestValidator.equals(
    "moderator record removed after unban",
    moderatorRecordStillExists,
    false,
  );
}
