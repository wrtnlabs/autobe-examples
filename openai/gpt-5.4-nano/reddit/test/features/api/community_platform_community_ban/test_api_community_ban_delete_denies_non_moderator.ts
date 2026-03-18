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
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_community_ban_delete_denies_non_moderator(
  connection: api.IConnection,
): Promise<void> {
  const adminConnection: api.IConnection = { host: connection.host };
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = typia.random<string & tags.Format<"password">>();
  await authorize_admin_join(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  const admin = await authorize_admin_login(adminConnection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ILogin,
  });
  typia.assert(admin);
  const bannedMemberConnection: api.IConnection = { host: connection.host };
  const moderatorLikeMemberConnection: api.IConnection = {
    host: connection.host,
  };
  const bannedMemberEmail = typia.random<string & tags.Format<"email">>();
  const bannedMemberPassword = typia.random<string & tags.Format<"password">>();
  const bannedMember = await authorize_member_join(bannedMemberConnection, {
    body: {
      email: bannedMemberEmail,
      password: bannedMemberPassword,
    },
  });
  typia.assert(bannedMember);
  const moderatorLikeMemberEmail = typia.random<
    string & tags.Format<"email">
  >();
  const moderatorLikeMemberPassword = typia.random<
    string & tags.Format<"password">
  >();
  const moderatorLikeMember = await authorize_member_join(
    moderatorLikeMemberConnection,
    {
      body: {
        email: moderatorLikeMemberEmail,
        password: moderatorLikeMemberPassword,
      },
    },
  );
  typia.assert(moderatorLikeMember);
  const communityBan =
    await generate_random_community_platform_admin_bans_create(
      adminConnection,
      {
        body: {
          // Let the generator handle community_id validity by only overriding
          // actor-related fields we can control.
          banned_user_id: bannedMember.id,
          applied_by_moderator_id: moderatorLikeMember.id,
          banned_at: new Date().toISOString(),
          unbanned_at: null,
          ban_reason: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies DeepPartial<ICommunityPlatformCommunityBan.ICreate> as
          | ICommunityPlatformCommunityBan.ICreate
          | DeepPartial<ICommunityPlatformCommunityBan.ICreate>,
      } as {
        body?: DeepPartial<ICommunityPlatformCommunityBan.ICreate> | undefined;
      },
    );
  typia.assert(communityBan);
  const banId = communityBan.id;
  const nonModeratorConnection: api.IConnection = { host: connection.host };
  const nonModeratorEmail = typia.random<string & tags.Format<"email">>();
  const nonModeratorPassword = typia.random<string & tags.Format<"password">>();
  await authorize_member_join(nonModeratorConnection, {
    body: {
      email: nonModeratorEmail,
      password: nonModeratorPassword,
    },
  });
  await TestValidator.httpError(
    "non-moderator cannot delete community ban",
    [401, 403],
    async () => {
      await api.functional.communityPlatform.admin.bans.erase(
        nonModeratorConnection,
        {
          banId,
        },
      );
    },
  );
  // Indirectly confirm ban still exists by ensuring admin can delete it.
  await api.functional.communityPlatform.admin.bans.erase(adminConnection, {
    banId,
  });
}
