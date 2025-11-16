import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformContentQuarantine } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformContentQuarantine";

/**
 * Validate administrator update for quarantine record: set explicit end_at and
 * reassign target from post to community.
 *
 * 1. Register administrator (join).
 * 2. Create quarantine for a post.
 * 3. Update quarantine: new end_at and change target to community
 *    (target_community_id, target_post_id=null).
 * 4. Confirm mutation (fields set/changed as intended, rest untouched).
 */
export async function test_api_content_quarantine_update_set_end_at_and_change_target(
  connection: api.IConnection,
) {
  // 1. Register administrator
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(12) + "!Aa1";
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // 2. Create quarantine for a post
  const quarantineType = RandomGenerator.pick([
    "spam",
    "abuse",
    "investigation",
    "legal_hold",
  ] as const);
  const status = RandomGenerator.pick([
    "active",
    "lifted",
    "expired",
    "revoked",
  ] as const);
  const start_at = new Date().toISOString();
  const postId = typia.random<string & tags.Format<"uuid">>();
  const quarantine =
    await api.functional.communityPlatform.administrator.contentQuarantines.create(
      connection,
      {
        body: {
          quarantine_type: quarantineType,
          status,
          start_at,
          target_post_id: postId,
        } satisfies ICommunityPlatformContentQuarantine.ICreate,
      },
    );
  typia.assert(quarantine);
  TestValidator.equals(
    "initial target is post",
    quarantine.target_post_id,
    postId,
  );
  TestValidator.equals("initial status", quarantine.status, status);
  TestValidator.equals(
    "initial quarantine type",
    quarantine.quarantine_type,
    quarantineType,
  );

  // 3. Update quarantine: set end_at and change target to community
  const end_at = new Date(Date.now() + 86400000).toISOString();
  const communityId = typia.random<string & tags.Format<"uuid">>();
  const updated =
    await api.functional.communityPlatform.administrator.contentQuarantines.update(
      connection,
      {
        contentQuarantineId: quarantine.id,
        body: {
          end_at,
          target_community_id: communityId,
          target_post_id: null,
        } satisfies ICommunityPlatformContentQuarantine.IUpdate,
      },
    );
  typia.assert(updated);

  // 4. Validate updated fields and data consistency
  TestValidator.equals(
    "target_post_id becomes null",
    updated.target_post_id,
    null,
  );
  TestValidator.equals(
    "target_community_id assigned",
    updated.target_community_id,
    communityId,
  );
  TestValidator.equals("end_at updated", updated.end_at, end_at);
  TestValidator.equals(
    "start_at is unchanged",
    updated.start_at,
    quarantine.start_at,
  );
  TestValidator.equals(
    "quarantine_type is unchanged",
    updated.quarantine_type,
    quarantine.quarantine_type,
  );
  TestValidator.equals(
    "status is unchanged",
    updated.status,
    quarantine.status,
  );
  TestValidator.equals("id is unchanged", updated.id, quarantine.id);
  TestValidator.equals(
    "moderation_action_id remains same",
    updated.moderation_action_id,
    quarantine.moderation_action_id,
  );
  TestValidator.equals(
    "created_at is unchanged",
    updated.created_at,
    quarantine.created_at,
  );
}
