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

/**
 * Test comprehensive ban revocation workflow for community platform moderation system.
 * 1. Create admin account and authenticate
 * 2. Create a community ban record with active status
 * 3. Revoke the ban by updating status to 'revoked' with revocation reason
 * 4. Verify ban status changes, revocation timestamp is set, and audit trail captures revocation details
 */
export async function test_api_ban_revocation_workflow(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup and authentication
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
  // 2. Create a community ban record
  const banCreateBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.paragraph({ sentences: 2 }),
    expires_at: null,
  } satisfies ICommunityPlatformCommunityBan.ICreate;
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const ban =
    await api.functional.communityPlatform.admin.communities.bans.create(
      adminConnection,
      {
        communityId: communityId,
        body: banCreateBody,
      },
    );
  typia.assert(ban);
  // 3. Revoke the ban by updating status to 'revoked' with revocation reason
  const revokeReason = RandomGenerator.paragraph({ sentences: 1 });
  const banUpdateBody = {
    status: "revoked",
    revoke_reason: revokeReason,
  } satisfies ICommunityPlatformCommunityBan.IUpdate;
  const revokedBan =
    await api.functional.communityPlatform.admin.communities.bans.update(
      adminConnection,
      {
        communityId: communityId,
        banId: ban.id,
        body: banUpdateBody,
      },
    );
  typia.assert(revokedBan);
  // 4. Verify ban status changes and revocation details
  TestValidator.equals(
    "ban status should be revoked",
    revokedBan.status,
    "revoked",
  );
  TestValidator.equals(
    "revoke reason should match",
    revokedBan.revoke_reason,
    revokeReason,
  );
  TestValidator.predicate(
    "revoked_at timestamp should be set",
    revokedBan.revoked_at !== null,
  );
  TestValidator.predicate(
    "updated_at should be after banned_at",
    new Date(revokedBan.updated_at).getTime() >
      new Date(ban.banned_at).getTime(),
  );
}
