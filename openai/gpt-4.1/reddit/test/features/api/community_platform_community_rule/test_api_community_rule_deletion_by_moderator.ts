import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Ensure that a registered member can create a community, be assigned as its
 * moderator, create a rule, and then delete the rule as the community's
 * moderator.
 *
 * Business Requirements:
 *
 * - Only moderators may manage rules for their assigned community.
 * - Rule deletion is irreversible—a hard delete without soft-deletion.
 * - Attempting to access the rule after deletion should not retrieve it (not
 *   fetchable).
 *
 * Steps:
 *
 * 1. Register a new platform member using a unique email/password.
 * 2. Member creates a new community with unique name/title/slug/description.
 * 3. Register the member as moderator for their new community with matching
 *    email/password/communityId.
 * 4. As the moderator, create a rule document for the community—provide body,
 *    version, and published_at.
 * 5. As moderator, delete the rule using the appropriate communityId and ruleId.
 * 6. Assert that API call for deletion returns without error (void) and that a
 *    subsequent attempt to delete again (idempotency check) results in business
 *    error.
 * 7. Audit trail is system-responsibility—verify at least by negative fetch test
 *    (not directly through SDK).
 */
export async function test_api_community_rule_deletion_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register member
  const email = typia.random<string & tags.Format<"email">>();
  const password = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: { email, password } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Member creates community
  const communityName = RandomGenerator.alphaNumeric(12);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: communityName,
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({ paragraphs: 1 }),
          slug: communityName,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Register member as moderator for community
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email,
      password,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 4. As moderator, create a rule document
  const now = new Date().toISOString();
  const rule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          body: RandomGenerator.content({ paragraphs: 2 }),
          version: 1,
          published_at: now,
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // 5. Delete the rule.
  await api.functional.communityPlatform.moderator.communities.rules.erase(
    connection,
    {
      communityId: community.id,
      ruleId: rule.id,
    },
  );

  // 6. Attempt to delete it again should error (idempotency/business rule validation)
  await TestValidator.error(
    "deleting already deleted rule should error",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.erase(
        connection,
        {
          communityId: community.id,
          ruleId: rule.id,
        },
      );
    },
  );
}
