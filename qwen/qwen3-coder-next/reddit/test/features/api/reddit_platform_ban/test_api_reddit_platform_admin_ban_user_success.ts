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

export async function test_api_reddit_platform_admin_ban_user_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Create admin account and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminUser = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
      display_name: RandomGenerator.name(1),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
    } satisfies IRedditPlatformAdmin.IJoin,
  });
  typia.assert(adminUser);
  // 2. Create target member account and authenticate
  const memberConnection: api.IConnection = { host: connection.host };
  const targetMember = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.name(),
    } satisfies IRedditPlatformMember.IJoin,
  });
  typia.assert(targetMember);
  // 3. Admin creates a community and becomes the owner
  const community =
    await generate_random_reddit_platform_member_communities_create(
      adminConnection,
      {
        body: {
          name: "test-community-" + RandomGenerator.alphaNumeric(6),
          description: RandomGenerator.paragraph({ sentences: 3 }),
          icon_url: null,
        } satisfies IRedditPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  // 4. Assign admin as moderator of the community
  const moderatorAssignment =
    await generate_random_reddit_platform_admin_communities_moderators_create_moderator(
      adminConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          community_id: community.id,
          user_id: adminUser.id,
          role: "OWNER",
        } satisfies IRedditPlatformModeration.ICreate,
      },
    );
  typia.assert(moderatorAssignment);
  // 5. Admin bans the target user from the community
  const banReason = "Violation of community guidelines";
  const banRecord =
    await generate_random_reddit_platform_admin_communities_bans_ban(
      adminConnection,
      {
        params: {
          communityId: community.id,
        },
        body: {
          community_id: community.id,
          user_id: targetMember.id,
          reason: banReason,
          expired_at: null,
        } satisfies IRedditPlatformBan.ICreate,
      },
    );
  typia.assert(banRecord);
  // 6. Validate ban record
  TestValidator.equals(
    "community matches",
    banRecord.community.id,
    community.id,
  );
  TestValidator.equals("user matches", banRecord.user.id, targetMember.id);
  TestValidator.equals(
    "bannedBy matches admin",
    banRecord.bannedBy.id,
    adminUser.id,
  );
  TestValidator.equals("reason matches", banRecord.reason, banReason);
  TestValidator.predicate(
    "bannedAt is valid",
    new Date(banRecord.bannedAt) instanceof Date,
  );
  TestValidator.equals(
    "expiredAt is null for permanent ban",
    banRecord.expiredAt,
    null,
  );
}