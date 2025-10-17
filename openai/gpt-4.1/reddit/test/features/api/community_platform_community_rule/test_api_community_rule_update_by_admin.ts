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
 * Validate that a platform admin can update a community rule document
 * correctly, enforcing versioning, authentication, and permission constraints.
 *
 * Steps:
 *
 * 1. Register a member
 * 2. Member creates a community
 * 3. Register a moderator with that community
 * 4. Moderator (by admin endpoint) creates an initial rules document
 * 5. Register a new admin
 * 6. Admin updates the rule document body, version, published date
 * 7. Verify response contains updated values, with version incremented
 * 8. Attempt unauthorized update as member (should error)
 * 9. Attempt update using non-existent ruleId (should error)
 *
 * All business requirements in DTO and API docs are enforced: only
 * admin/moderator can update, version increases, metadata is updated, forbidden
 * for standard members. Edge/error cases are covered.
 */
export async function test_api_community_rule_update_by_admin(
  connection: api.IConnection,
) {
  // 1. Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // 2. Member creates a community
  const communityBody = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    slug: RandomGenerator.alphaNumeric(12),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      { body: communityBody },
    );
  typia.assert(community);

  // 3. Register moderator for the community
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderatorPassword = RandomGenerator.alphaNumeric(12);
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: moderatorEmail,
      password: moderatorPassword,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // 4. Create initial rules document as moderator (using admin endpoint, but with moderator token)
  const ruleBody = {
    body: RandomGenerator.content({ paragraphs: 3 }),
    version: 1 satisfies number as number,
    published_at: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunityRule.ICreate;
  const rule =
    await api.functional.communityPlatform.admin.communities.rules.create(
      connection,
      { communityId: community.id, body: ruleBody },
    );
  typia.assert(rule);
  TestValidator.equals("initial rule version is 1", rule.version, 1);

  // 5. Register a new admin and switch connection to admin context
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(14);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 6. Admin updates rules document
  const newVersion = rule.version + 1;
  const updateBody = {
    body: RandomGenerator.content({ paragraphs: 2 }),
    version: newVersion,
    published_at: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunityRule.IUpdate;
  const updatedRule =
    await api.functional.communityPlatform.admin.communities.rules.update(
      connection,
      {
        communityId: community.id,
        ruleId: rule.id,
        body: updateBody,
      },
    );
  typia.assert(updatedRule);
  TestValidator.equals(
    "rule version incremented",
    updatedRule.version,
    newVersion,
  );
  TestValidator.notEquals(
    "rule updated_at changed",
    updatedRule.updated_at,
    rule.updated_at,
  );
  TestValidator.equals("rule updated body", updatedRule.body, updateBody.body);

  // 7. Try update with member token (should fail)
  const asMemberConn: api.IConnection = { ...connection, headers: {} };
  await api.functional.auth.member.join(asMemberConn, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(10),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  await TestValidator.error("member cannot update community rule", async () => {
    await api.functional.communityPlatform.admin.communities.rules.update(
      asMemberConn,
      {
        communityId: community.id,
        ruleId: rule.id,
        body: { ...updateBody, version: newVersion + 1 },
      },
    );
  });

  // 8. Try with non-existent rule (should fail)
  await TestValidator.error(
    "updating non-existent rule should error",
    async () => {
      await api.functional.communityPlatform.admin.communities.rules.update(
        connection,
        {
          communityId: community.id,
          ruleId: typia.random<string & tags.Format<"uuid">>(),
          body: { ...updateBody, version: newVersion + 2 },
        },
      );
    },
  );
}
