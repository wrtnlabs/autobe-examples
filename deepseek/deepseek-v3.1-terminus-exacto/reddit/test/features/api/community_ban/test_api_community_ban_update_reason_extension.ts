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
 * Test community ban update with reason modification and expiration extension.
 *
 * 1. Authenticate as a moderator
 * 2. Create an initial ban record
 * 3. Update the ban with new reason and extended expiration
 * 4. Validate that only specified fields are updated
 * 5. Confirm relationships and timestamps are preserved correctly
 */
export async function test_api_community_ban_update_reason_extension(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
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
  // 2. Create initial ban record using utility function
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const initialBanBody = {
    user_id: typia.random<string & tags.Format<"uuid">>(),
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days from now
  } satisfies ICommunityPlatformCommunityBan.ICreate;
  const initialBan =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        body: initialBanBody,
        params: { communityId },
      },
    );
  typia.assert(initialBan);
  // Validate initial ban status
  TestValidator.equals(
    "initial ban status is active",
    initialBan.status,
    "active",
  );
  // 3. Update ban with new reason and extended expiration
  const updateBody = {
    reason: RandomGenerator.paragraph({ sentences: 1 }),
    expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days from now
  } satisfies ICommunityPlatformCommunityBan.IUpdate;
  const updatedBan =
    await api.functional.communityPlatform.moderator.communities.bans.update(
      moderatorConnection,
      {
        communityId,
        banId: initialBan.id,
        body: updateBody,
      },
    );
  typia.assert(updatedBan);
  // 4. Validate updates
  TestValidator.equals("ban ID unchanged", updatedBan.id, initialBan.id);
  TestValidator.equals("reason updated", updatedBan.reason, updateBody.reason);
  TestValidator.equals(
    "expires_at updated",
    updatedBan.expires_at,
    updateBody.expires_at,
  );
  TestValidator.equals("status remains active", updatedBan.status, "active");
  TestValidator.equals(
    "banned_at unchanged",
    updatedBan.banned_at,
    initialBan.banned_at,
  );
  TestValidator.equals(
    "created_at unchanged",
    updatedBan.created_at,
    initialBan.created_at,
  );
  TestValidator.notEquals(
    "updated_at refreshed",
    updatedBan.updated_at,
    initialBan.updated_at,
  );
  // 5. Validate relationships preserved
  TestValidator.equals(
    "community unchanged",
    updatedBan.community.id,
    initialBan.community.id,
  );
  TestValidator.equals(
    "user unchanged",
    updatedBan.user.id,
    initialBan.user.id,
  );
  TestValidator.equals(
    "moderator unchanged",
    updatedBan.moderator.id,
    initialBan.moderator.id,
  );
  // 6. Validate other fields unchanged
  TestValidator.equals(
    "revoked_at unchanged",
    updatedBan.revoked_at,
    initialBan.revoked_at,
  );
  TestValidator.equals(
    "revoke_reason unchanged",
    updatedBan.revoke_reason,
    initialBan.revoke_reason,
  );
}
