import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityModerator";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
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
import { generate_random_community_platform_admin_bans_create } from "../../../generate/generate_random_community_platform_admin_bans_create";
import { generate_random_community_platform_communities_create } from "../../../generate/generate_random_community_platform_communities_create";
import { generate_random_community_platform_community_moderators_create } from "../../../generate/generate_random_community_platform_community_moderators_create";
import { prepare_random_community_platform_community } from "../../../prepare/prepare_random_community_platform_community";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";
import { prepare_random_community_platform_community_moderator } from "../../../prepare/prepare_random_community_platform_community_moderator";

export async function test_api_community_ban_unban_authority_and_inactive_unban_rejected(
  connection: api.IConnection,
): Promise<void> {
  // Admin baseline
  const adminConnection: api.IConnection = { host: connection.host };
  const adminCreds: ICommunityPlatformAdmin.IJoin = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
    ip: typia.random<string & tags.Format<"ipv4">>(),
  };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: adminCreds,
  });
  typia.assert(adminJoin);
  // Create a community (owned by admin)
  const community = await generate_random_community_platform_communities_create(
    adminConnection,
    {
      body: {
        name: RandomGenerator.name(2),
        description: RandomGenerator.paragraph({ sentences: 2 }),
        icon_href:
          `https://${RandomGenerator.alphabets(12)}.example.com/icon.png` satisfies string &
            tags.Format<"uri">,
      } satisfies ICommunityPlatformCommunity.ICreate,
    },
  );
  typia.assert(community);
  // Moderator member identity
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = typia.random<string & tags.Format<"password">>();
  const moderatorJoin = await authorize_member_join(
    { host: connection.host },
    {
      body: {
        email: moderatorEmail,
        password: moderatorPassword,
      } satisfies ICommunityPlatformMember.IJoin,
    },
  );
  typia.assert(moderatorJoin);
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorLogin = await authorize_member_login(moderatorConnection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformMember.ILogin,
  });
  typia.assert(moderatorLogin);
  // Assign moderator to the created community (admin scopes this step)
  const moderatorAssignment =
    await generate_random_community_platform_community_moderators_create(
      adminConnection,
      {
        body: {
          communityId: community.id,
          moderatorUserId: moderatorJoin.id,
        } satisfies ICommunityPlatformCommunityModerator.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // Create an active community ban (admin-scoped)
  const banReason = RandomGenerator.paragraph({ sentences: 1 });
  const activeBan = await generate_random_community_platform_admin_bans_create(
    adminConnection,
    {
      body: {
        community_id: community.id,
        banned_user_id: moderatorJoin.id,
        applied_by_moderator_id: moderatorJoin.id,
        banned_at: new Date().toISOString(),
        unbanned_at: null,
        ban_reason: banReason,
      } satisfies ICommunityPlatformCommunityBan.ICreate,
    },
  );
  typia.assert(activeBan);
  // Scenario A: authorization boundary - moderator must NOT be able to call admin-scoped unban
  await TestValidator.httpError(
    "moderator cannot unban via admin-scoped endpoint",
    [400, 401, 403],
    async () => {
      await api.functional.communityPlatform.admin.bans.update(
        moderatorConnection,
        {
          banId: activeBan.id,
          body: {
            action: "unban",
            ban_reason: banReason,
          } satisfies ICommunityPlatformCommunityBan.IUpdate,
        },
      );
    },
  );
  // Scenario B: unban once succeeds, second unban (inactive) is rejected
  const unbanReason = RandomGenerator.paragraph({ sentences: 1 });
  const unbannedOnce = await api.functional.communityPlatform.admin.bans.update(
    adminConnection,
    {
      banId: activeBan.id,
      body: {
        action: "unban",
        ban_reason: unbanReason,
      } satisfies ICommunityPlatformCommunityBan.IUpdate,
    },
  );
  typia.assert(unbannedOnce);
  TestValidator.predicate(
    "ban is lifted after first unban",
    unbannedOnce.unbannedAt !== null,
  );
  await TestValidator.httpError(
    "second unban of inactive ban rejected",
    [400, 401, 403, 409],
    async () => {
      await api.functional.communityPlatform.admin.bans.update(
        adminConnection,
        {
          banId: activeBan.id,
          body: {
            action: "unban",
            ban_reason: unbanReason,
          } satisfies ICommunityPlatformCommunityBan.IUpdate,
        },
      );
    },
  );
}
