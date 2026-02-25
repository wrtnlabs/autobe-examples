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

export async function test_api_community_ban_partial_update_status_only(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderator = await authorize_moderator_join(moderatorConnection, {
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
  typia.assert(moderator);
  // Create a community ID for the ban
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create an expired ban (expires_at in the past) using utility function
  const pastExpiresAt = new Date(
    Date.now() - 24 * 60 * 60 * 1000,
  ).toISOString(); // 1 day ago
  const ban =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        params: { communityId },
        body: {
          expires_at: pastExpiresAt,
        },
      },
    );
  typia.assert(ban);
  // Store original values before update
  const originalReason = ban.reason;
  const originalExpiresAt = ban.expires_at;
  const originalRevokedAt = ban.revoked_at;
  const originalRevokeReason = ban.revoke_reason;
  const originalCommunity = ban.community;
  const originalUser = ban.user;
  const originalModerator = ban.moderator;
  // Perform partial update - only status field
  const updatedBan =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      moderatorConnection,
      {
        communityId,
        banId: ban.id,
        body: {
          status: "expired",
        } satisfies ICommunityPlatformCommunityBan.IUpdate,
      },
    );
  typia.assert(updatedBan);
  // Validate that only status field is updated
  TestValidator.equals(
    "status should be updated to expired",
    updatedBan.status,
    "expired",
  );
  TestValidator.equals(
    "reason should remain unchanged",
    updatedBan.reason,
    originalReason,
  );
  TestValidator.equals(
    "expires_at should remain unchanged",
    updatedBan.expires_at,
    originalExpiresAt,
  );
  TestValidator.equals(
    "revoked_at should remain unchanged",
    updatedBan.revoked_at,
    originalRevokedAt,
  );
  TestValidator.equals(
    "revoke_reason should remain unchanged",
    updatedBan.revoke_reason,
    originalRevokeReason,
  );
  // Validate relationships are preserved
  TestValidator.equals(
    "community relationship preserved",
    updatedBan.community.id,
    originalCommunity.id,
  );
  TestValidator.equals(
    "user relationship preserved",
    updatedBan.user.id,
    originalUser.id,
  );
  TestValidator.equals(
    "moderator relationship preserved",
    updatedBan.moderator.id,
    originalModerator.id,
  );
  // Validate updated_at timestamp is refreshed
  TestValidator.notEquals(
    "updated_at should be refreshed",
    updatedBan.updated_at,
    ban.updated_at,
  );
  TestValidator.predicate(
    "updated_at should be later than original",
    new Date(updatedBan.updated_at) > new Date(ban.updated_at),
  );
}
