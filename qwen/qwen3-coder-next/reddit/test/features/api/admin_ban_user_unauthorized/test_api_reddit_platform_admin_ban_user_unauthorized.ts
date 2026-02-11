import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformAdmin";
import type { IRedditPlatformBan } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformBan";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import type { IRedditPlatformModeration } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformModeration";
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
import { generate_random_reddit_platform_admin_communities_bans_ban } from "../../../generate/generate_random_reddit_platform_admin_communities_bans_ban";
import { generate_random_reddit_platform_admin_communities_moderators_create_moderator } from "../../../generate/generate_random_reddit_platform_admin_communities_moderators_create_moderator";
import { generate_random_reddit_platform_member_communities_create } from "../../../generate/generate_random_reddit_platform_member_communities_create";
import { prepare_random_reddit_platform_ban } from "../../../prepare/prepare_random_reddit_platform_ban";
import { prepare_random_reddit_platform_community } from "../../../prepare/prepare_random_reddit_platform_community";
import { prepare_random_reddit_platform_moderation } from "../../../prepare/prepare_random_reddit_platform_moderation";

export async function test_api_reddit_platform_admin_ban_user_unauthorized(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account (will attempt unauthorized ban)
  const adminConnection: api.IConnection = { host: connection.host };
  const unauthorizedAdmin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(unauthorizedAdmin);
  // 2. Create member account (will be the target user)
  const memberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      displayName: RandomGenerator.name(1),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(targetMember);
  // 3. Create another admin as owner of the community
  const ownerAdminConnection: api.IConnection = { host: connection.host };
  const communityOwner = await authorize_admin_join(ownerAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(communityOwner);
  // 4. Create community with different admin as owner
  const community =
    await api.functional.redditPlatform.member.communities.create(
      ownerAdminConnection,
      {
        body: {
          name: `community_${RandomGenerator.alphaNumeric(8)}`,
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 5. Assign different admin as moderator of the community
  const moderation =
    await api.functional.redditPlatform.admin.communities.moderators.createModerator(
      ownerAdminConnection,
      {
        communityId: community.id,
        body: {
          community_id: community.id,
          user_id: communityOwner.id,
          role: "OWNER",
        } satisfies IRedditPlatformModeration.ICreate,
      },
    );
  typia.assert(moderation);
  // 6. Try to ban user with unauthorized admin (should fail with 403 Forbidden)
  await TestValidator.httpError(
    "unauthorized admin should not be able to ban user",
    403,
    async () => {
      await api.functional.redditPlatform.admin.communities.bans.ban(
        adminConnection,
        {
          communityId: community.id,
          body: {
            community_id: community.id,
            user_id: targetMember.id,
            reason: RandomGenerator.paragraph({ sentences: 2 }),
            expired_at: null,
          } satisfies IRedditPlatformBan.ICreate,
        },
      );
    },
  );
}
