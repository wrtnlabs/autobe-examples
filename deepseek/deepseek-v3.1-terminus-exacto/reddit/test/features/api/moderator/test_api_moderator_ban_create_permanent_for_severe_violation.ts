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

export async function test_api_moderator_ban_create_permanent_for_severe_violation(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection
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
  // Generate a random community ID for the ban
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Create a permanent ban (null expires_at indicates permanent)
  const ban =
    await api.functional.communityPlatform.moderator.communities.bans.create(
      moderatorConnection,
      {
        communityId: communityId,
        body: {
          user_id: typia.random<string & tags.Format<"uuid">>(),
          reason: "Severe community violation - harassment and hate speech",
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
      },
    );
  typia.assert(ban);
  // Validate ban properties
  TestValidator.equals("ban status should be active", ban.status, "active");
  TestValidator.equals(
    "expires_at should be null for permanent ban",
    ban.expires_at,
    null,
  );
  TestValidator.equals(
    "reason should match input",
    ban.reason,
    "Severe community violation - harassment and hate speech",
  );
  TestValidator.predicate("ban should have valid ID", ban.id.length > 0);
  TestValidator.predicate(
    "banned_at should be valid timestamp",
    new Date(ban.banned_at).getTime() > 0,
  );
  TestValidator.predicate(
    "created_at should be valid timestamp",
    new Date(ban.created_at).getTime() > 0,
  );
  TestValidator.predicate(
    "updated_at should be valid timestamp",
    new Date(ban.updated_at).getTime() > 0,
  );
  // Validate nested objects
  TestValidator.predicate(
    "community should have valid ID",
    ban.community.id.length > 0,
  );
  TestValidator.predicate("user should have valid ID", ban.user.id.length > 0);
  TestValidator.predicate(
    "moderator should have valid ID",
    ban.moderator.id.length > 0,
  );
  TestValidator.equals(
    "moderator ID should match creating moderator",
    ban.moderator.id,
    moderator.id,
  );
}
