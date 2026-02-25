import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
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

import { authorize_moderator_join } from "../../../authorize/authorize_moderator_join";
import { authorize_moderator_login } from "../../../authorize/authorize_moderator_login";
import { authorize_moderator_refresh } from "../../../authorize/authorize_moderator_refresh";
import { generate_random_community_platform_moderator_communities_bans_create } from "../../../generate/generate_random_community_platform_moderator_communities_bans_create";
import { prepare_random_community_platform_community_ban } from "../../../prepare/prepare_random_community_platform_community_ban";

/**
 * Test community ban revocation with reason workflow.
 * 1. Authenticate as moderator
 * 2. Create an active ban record
 * 3. Revoke the ban with status 'revoked', revoke_reason, and revoked_at
 * 4. Validate ban status transition and revocation details
 */
export async function test_api_community_ban_revocation_with_reason(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  await authorize_moderator_join(moderatorConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      username: RandomGenerator.alphabets(8),
      display_name: RandomGenerator.name(),
      bio: RandomGenerator.paragraph({ sentences: 2 }),
      avatar_url: typia.random<string & tags.Format<"uri">>(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
      ip: typia.random<string & tags.Format<"ipv4">>(),
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Create a mock community ID for the ban
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // 2. Create an active ban record using utility function
  const ban =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId },
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          reason: RandomGenerator.paragraph({ sentences: 1 }),
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Validate initial ban status is active
  TestValidator.equals(
    "initial ban status should be active",
    ban.status,
    "active",
  );
  // 3. Revoke the ban with status 'revoked', revoke_reason, and revoked_at
  const revocationTimestamp = new Date().toISOString();
  const revokeReason = "User has demonstrated improved behavior";
  const updatedBan =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      moderatorConnection,
      {
        communityId,
        banId: ban.id,
        body: {
          status: "revoked",
          revoke_reason: revokeReason,
          revoked_at: revocationTimestamp,
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // 4. Validate ban status transition and revocation details
  TestValidator.equals(
    "ban status should transition to revoked",
    updatedBan.status,
    "revoked",
  );
  TestValidator.equals(
    "revoke_reason should match",
    updatedBan.revoke_reason,
    revokeReason,
  );
  TestValidator.equals(
    "revoked_at timestamp should match",
    updatedBan.revoked_at,
    revocationTimestamp,
  );
  // Validate that other fields remain unchanged
  TestValidator.equals("ban ID should remain unchanged", updatedBan.id, ban.id);
  TestValidator.equals(
    "original reason should remain unchanged",
    updatedBan.reason,
    ban.reason,
  );
  TestValidator.equals(
    "banned_at timestamp should remain unchanged",
    updatedBan.banned_at,
    ban.banned_at,
  );
  TestValidator.equals(
    "expires_at should remain unchanged",
    updatedBan.expires_at,
    ban.expires_at,
  );
  // Validate relationships remain intact
  TestValidator.equals(
    "community relationship should remain",
    updatedBan.community.id,
    ban.community.id,
  );
  TestValidator.equals(
    "user relationship should remain",
    updatedBan.user.id,
    ban.user.id,
  );
  TestValidator.equals(
    "moderator relationship should remain",
    updatedBan.moderator.id,
    ban.moderator.id,
  );
}
