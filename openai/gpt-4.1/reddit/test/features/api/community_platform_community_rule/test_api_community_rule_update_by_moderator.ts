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
 * Validate moderator community rule update with full permission logic and error
 * paths.
 *
 * Steps:
 *
 * 1. Register a platform member (generates unique email)
 * 2. Member creates a new community (using own credentials)
 * 3. Register as moderator in the same community (using same email)
 * 4. Admin creates the initial rules document for this community
 * 5. Moderator performs update on the rules: updates body, increments version,
 *    sets new published_at
 * 6. Validate output: new body, correct incremented version, updated timestamps
 * 7. Error case: attempt rule update as an unrelated newly registered moderator
 *    (different community) -- must be denied
 * 8. Error case: attempt rule update as generic member (not moderator) -- must be
 *    denied
 */
export async function test_api_community_rule_update_by_moderator(
  connection: api.IConnection,
) {
  // 1. Register a member (owner of the community)
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Create a community as member
  const communitySlug = RandomGenerator.alphaNumeric(10);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 5 }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);
  TestValidator.equals(
    "community creator matches member",
    community.creator_member_id,
    member.id,
  );

  // 3. Register as moderator (must match member email and specify community)
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  // Use same email and new password
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);
  TestValidator.equals(
    "moderator community matches",
    moderator.community_id,
    community.id,
  );

  // 4. Create initial rules as admin
  // (Simulate as current user; typically admin, but test assumes owner has enough permission)
  const rule_v1 =
    await api.functional.communityPlatform.admin.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: {
          body: RandomGenerator.paragraph({ sentences: 10 }),
          version: 1,
          published_at: new Date().toISOString(),
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule_v1);
  TestValidator.equals("initial rule version is 1", rule_v1.version, 1);

  // 5. Update the rule as authenticated moderator
  // Authenticate as moderator (overwrites token)
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });

  const updateBody = RandomGenerator.paragraph({ sentences: 12 });
  const updatePublishedAt = new Date(Date.now() + 60 * 1000).toISOString(); // +1 minute
  const rule_v2 =
    await api.functional.communityPlatform.moderator.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: rule_v1.id,
        body: {
          body: updateBody,
          version: rule_v1.version + 1,
          published_at: updatePublishedAt,
        } satisfies ICommunityPlatformCommunityRule.IUpdate,
      },
    );
  typia.assert(rule_v2);
  TestValidator.equals("rule id stays same", rule_v2.id, rule_v1.id);
  TestValidator.equals(
    "community id unchanged",
    rule_v2.community_id,
    community.id,
  );
  TestValidator.equals("body updated", rule_v2.body, updateBody);
  TestValidator.equals(
    "version incremented",
    rule_v2.version,
    rule_v1.version + 1,
  );
  TestValidator.equals(
    "published_at updated",
    rule_v2.published_at,
    updatePublishedAt,
  );
  TestValidator.notEquals(
    "updated_at changed",
    rule_v2.updated_at,
    rule_v1.updated_at,
  );

  // 6. Attempt update as a different, unrelated moderator (must fail)
  // Register another member/moderator (other community)
  const otherMemberEmail = typia.random<string & tags.Format<"email">>();
  const otherMemberPassword = RandomGenerator.alphaNumeric(10);
  await api.functional.auth.member.join(connection, {
    body: {
      email: otherMemberEmail,
      password: otherMemberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  // Create another community
  const otherCommunity =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          title: RandomGenerator.paragraph({ sentences: 1 }),
          description: RandomGenerator.paragraph({ sentences: 4 }),
          slug: RandomGenerator.alphaNumeric(10),
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  // Register as moderator for new community
  const otherModeratorPassword = RandomGenerator.alphaNumeric(12);
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: otherMemberEmail,
      password: otherModeratorPassword,
      community_id: otherCommunity.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  // Now, attempt update on original rules as this unrelated moderator
  await TestValidator.error(
    "unrelated moderator forbidden to update rules",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.update(
        connection,
        {
          communityId: community.id,
          ruleId: rule_v1.id,
          body: {
            body: "Should not succeed",
            version: rule_v2.version + 1,
            published_at: new Date(Date.now() + 120 * 1000).toISOString(),
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );

  // 7. Attempt update as generic member (not moderator) -- must fail
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error(
    "non-moderator forbidden to update rules",
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.update(
        connection,
        {
          communityId: community.id,
          ruleId: rule_v1.id,
          body: {
            body: "Should not succeed 2",
            version: rule_v2.version + 2,
            published_at: new Date(Date.now() + 180 * 1000).toISOString(),
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );
}
