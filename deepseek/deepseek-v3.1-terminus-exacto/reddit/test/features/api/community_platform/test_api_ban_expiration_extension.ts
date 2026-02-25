import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityBan } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityBan";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_community_platform_admin_communities_bans_create } from "../../../generate/generate_random_community_platform_admin_communities_bans_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

export async function test_api_ban_expiration_extension(
  connection: api.IConnection,
): Promise<void> {
  // Create admin connection and authenticate using utility function
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      display_name: RandomGenerator.name(),
      permissions_level: null,
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  typia.assert(admin);
  // Create a community ban with short-term expiration
  const banCreateBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    expires_at: new Date(Date.now() + 1000 * 60 * 60).toISOString(), // 1 hour from now
  } satisfies ICommunityPlatformCommunityBan.ICreate;
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const ban =
    await api.functional.communityPlatform.admin.communities.bans.create(
      adminConnection,
      {
        communityId,
        body: banCreateBody,
      },
    );
  typia.assert(ban);
  // Verify initial ban details
  TestValidator.equals("ban status is active", ban.status, "active");
  TestValidator.equals("ban reason matches", ban.reason, banCreateBody.reason);
  TestValidator.predicate("ban has expiration date", ban.expires_at !== null);
  // Extend ban expiration to future date
  const newExpiration = new Date(
    Date.now() + 1000 * 60 * 60 * 24 * 7,
  ).toISOString(); // 1 week from now
  const banUpdateBody = {
    expires_at: newExpiration,
  } satisfies ICommunityPlatformCommunityBan.IUpdate;
  const updatedBan =
    await api.functional.communityPlatform.admin.communities.bans.update(
      adminConnection,
      {
        communityId,
        banId: ban.id,
        body: banUpdateBody,
      },
    );
  typia.assert(updatedBan);
  // Verify ban expiration was extended
  TestValidator.equals(
    "expiration date updated",
    updatedBan.expires_at,
    newExpiration,
  );
  TestValidator.equals(
    "ban status remains active",
    updatedBan.status,
    "active",
  );
  TestValidator.equals("reason unchanged", updatedBan.reason, ban.reason);
  TestValidator.equals(
    "community unchanged",
    updatedBan.community.id,
    ban.community.id,
  );
  TestValidator.equals("user unchanged", updatedBan.user.id, ban.user.id);
  TestValidator.equals(
    "moderator unchanged",
    updatedBan.moderator.id,
    ban.moderator.id,
  );
  // Test validation: reject past expiration date
  const pastExpiration = new Date(Date.now() - 1000 * 60 * 60).toISOString(); // 1 hour ago
  const invalidUpdateBody = {
    expires_at: pastExpiration,
  } satisfies ICommunityPlatformCommunityBan.IUpdate;
  await TestValidator.error("reject past expiration date", async () => {
    await api.functional.communityPlatform.admin.communities.bans.update(
      adminConnection,
      {
        communityId,
        banId: ban.id,
        body: invalidUpdateBody,
      },
    );
  });
}
