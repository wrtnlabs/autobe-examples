import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Validate that admins can delete any community rule, while normal members and
 * moderators cannot.
 *
 * 1. Register a member
 * 2. Member creates a new community
 * 3. Admin registers
 * 4. Moderator is registered to the community
 * 5. Moderator creates a rule
 * 6. Admin deletes the rule
 * 7. Confirm deletion by attempting admin delete again (should error)
 * 8. Try deletion as non-admins (member/moderator) and expect errors
 */
export async function test_api_community_rule_deletion_by_admin(
  connection: api.IConnection,
) {
  // 1. Register a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(10);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Member creates a new community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(8),
    title: RandomGenerator.paragraph({ sentences: 2 }),
    description: RandomGenerator.content({ paragraphs: 1 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Register a platform admin (random superuser status to test both variants)
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(10);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: RandomGenerator.pick([true, false] as const),
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 4. Register a moderator assigned to the community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(10);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 5. Moderator creates a rule document
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  }); // to set moderator token
  const ruleBody = {
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: 1,
    published_at: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunityRule.ICreate;
  const rule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: ruleBody,
      },
    );
  typia.assert(rule);

  // 6. Switch to admin session
  await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
      superuser: admin.superuser,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });

  // 7. Admin deletes the rule (should succeed)
  await api.functional.communityPlatform.admin.communities.rules.erase(
    connection,
    {
      communityId: community.id,
      ruleId: rule.id,
    },
  );

  // 8. Confirm deletion by attempting admin delete again (should error)
  await TestValidator.error(
    "admin cannot delete already-deleted rule",
    async () => {
      await api.functional.communityPlatform.admin.communities.rules.erase(
        connection,
        {
          communityId: community.id,
          ruleId: rule.id,
        },
      );
    },
  );

  // 9. Ensure non-admins cannot delete (switch to normal member)
  await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error("non-admin member cannot delete rule", async () => {
    await api.functional.communityPlatform.admin.communities.rules.erase(
      connection,
      {
        communityId: community.id,
        ruleId: rule.id,
      },
    );
  });

  // 10. Try as moderator as well
  await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  await TestValidator.error(
    "moderator cannot delete rule via admin endpoint",
    async () => {
      await api.functional.communityPlatform.admin.communities.rules.erase(
        connection,
        {
          communityId: community.id,
          ruleId: rule.id,
        },
      );
    },
  );
}
