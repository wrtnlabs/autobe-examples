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

export async function test_api_moderator_ban_create_with_different_content_violations(
  connection: api.IConnection,
): Promise<void> {
  // Create moderator connection and authenticate
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
  // Define different violation types and reasons
  const violationTypes = [
    { reason: "Spam content - multiple promotional posts", category: "spam" },
    {
      reason: "Harassment - targeted abusive comments",
      category: "harassment",
    },
    {
      reason: "Inappropriate content - explicit material",
      category: "inappropriate",
    },
    {
      reason: "Copyright infringement - unauthorized content",
      category: "copyright",
    },
    { reason: "Hate speech - discriminatory language", category: "hate" },
  ] as const;
  // Generate a community ID for testing (using random since we don't have community creation API)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Generate a user ID for banning (using random since we don't have user creation API)
  const userId = typia.random<string & tags.Format<"uuid">>();
  // Test each violation type
  for (const violation of violationTypes) {
    // Create ban with specific violation reason
    const ban =
      await generate_random_community_platform_moderator_communities_bans_create(
        moderatorConnection,
        {
          body: {
            user_id: userId,
            reason: violation.reason,
            expires_at: new Date(
              Date.now() + 30 * 24 * 60 * 60 * 1000,
            ).toISOString(), // 30 days from now
          } satisfies ICommunityPlatformCommunityBan.ICreate,
          params: { communityId },
        },
      );
    typia.assert(ban);
    // Validate ban record properties
    TestValidator.equals(
      "ban reason matches input",
      ban.reason,
      violation.reason,
    );
    TestValidator.equals("ban user ID matches", ban.user.id, userId);
    TestValidator.equals(
      "ban community ID matches",
      ban.community.id,
      communityId,
    );
    TestValidator.equals(
      "ban moderator ID matches",
      ban.moderator.id,
      moderatorAuth.id,
    );
    TestValidator.predicate("ban has valid status", ban.status === "active");
    TestValidator.predicate(
      "ban has creation timestamp",
      ban.banned_at.length > 0,
    );
    TestValidator.predicate(
      "ban has expiration date",
      ban.expires_at !== null && ban.expires_at !== undefined,
    );
    TestValidator.predicate(
      "ban has not been revoked",
      ban.revoked_at === null || ban.revoked_at === undefined,
    );
  }
  // Test permanent ban (no expiration)
  const permanentBan =
    await generate_random_community_platform_moderator_communities_bans_create(
      moderatorConnection,
      {
        body: {
          user_id: userId,
          reason: "Permanent ban - repeated violations",
          expires_at: null,
        } satisfies ICommunityPlatformCommunityBan.ICreate,
        params: { communityId },
      },
    );
  typia.assert(permanentBan);
  TestValidator.equals(
    "permanent ban has null expiration",
    permanentBan.expires_at,
    null,
  );
  TestValidator.equals(
    "permanent ban reason is correct",
    permanentBan.reason,
    "Permanent ban - repeated violations",
  );
}
