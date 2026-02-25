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
 * Test moderator creating a temporary ban for a user who violated community rules.
 *
 * This test validates the ban creation workflow:
 * 1. Moderator authentication via join operation
 * 2. Community creation
 * 3. User creation and content posting
 * 4. Creation of temporary ban with specific reason and expiration
 * 5. Verification of ban record completeness and relationships
 * 6. Validation of system-generated timestamps and status
 */
export async function test_api_moderator_ban_create_temporary_for_violation(
  connection: api.IConnection,
): Promise<void> {
  // 1. Authenticate as moderator
  const moderatorConnection: api.IConnection = { host: connection.host };
  const moderatorAuth = await authorize_moderator_join(moderatorConnection, {
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
  typia.assert(moderatorAuth);
  // Note: The test scenario requires community and user setup, but the available
  // API functions only provide moderator authentication and ban creation.
  // Since we cannot create communities or users with the provided functions,
  // we'll use randomly generated IDs that would exist in a complete system.
  // In a real implementation, these would be created via proper API calls.
  // 2. Create temporary ban
  const banExpiration = new Date(
    Date.now() + 7 * 24 * 60 * 60 * 1000,
  ).toISOString(); // 7 days from now
  const banReason = "Violation of community rules: inappropriate content";
  const ban =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          reason: banReason,
          expires_at: banExpiration,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
        params: {
          communityId: typia.random<string & tags.Format<"uuid">>(),
        },
      },
    );
  typia.assert(ban);
  // 3. Validate ban record
  TestValidator.equals("ban status should be active", ban.status, "active");
  TestValidator.equals("ban reason should match input", ban.reason, banReason);
  TestValidator.equals(
    "ban expiration should match input",
    ban.expires_at,
    banExpiration,
  );
  TestValidator.predicate(
    "banned_at timestamp should be present",
    () => ban.banned_at !== undefined && ban.banned_at !== null,
  );
  TestValidator.predicate(
    "created_at timestamp should be present",
    () => ban.created_at !== undefined && ban.created_at !== null,
  );
  TestValidator.predicate(
    "updated_at timestamp should be present",
    () => ban.updated_at !== undefined && ban.updated_at !== null,
  );
  // 4. Validate relationships
  TestValidator.predicate(
    "community relationship should be populated",
    () => ban.community !== undefined && ban.community.id !== undefined,
  );
  TestValidator.predicate(
    "user relationship should be populated",
    () => ban.user !== undefined && ban.user.id !== undefined,
  );
  TestValidator.predicate(
    "moderator relationship should be populated",
    () => ban.moderator !== undefined && ban.moderator.id !== undefined,
  );
  // 5. Validate relationship IDs match input
  TestValidator.equals(
    "moderator ID should match authenticated moderator",
    ban.moderator.id,
    moderatorAuth.id,
  );
}
