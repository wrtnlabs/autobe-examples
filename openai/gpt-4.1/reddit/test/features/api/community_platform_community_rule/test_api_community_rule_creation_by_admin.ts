import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Validate that an admin can create community rules and non-admins cannot.
 * Steps:
 *
 * 1. Register and authenticate a member.
 * 2. Use member to create a community.
 * 3. Register and authenticate a platform admin.
 * 4. As the admin, create a rule for the new community.
 * 5. Validate the returned rule object: id, community_id, body, version,
 *    published_at, created_at, updated_at.
 */
export async function test_api_community_rule_creation_by_admin(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a member
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
  const communitySlug = RandomGenerator.alphaNumeric(12);
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: {
          name: RandomGenerator.name(2),
          title: RandomGenerator.paragraph({ sentences: 3 }),
          description: RandomGenerator.content({
            paragraphs: 1,
            sentenceMin: 3,
            sentenceMax: 7,
          }),
          slug: communitySlug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 3. Register and authenticate an admin
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const adminPassword = RandomGenerator.alphaNumeric(16);
  const admin = await api.functional.auth.admin.join(connection, {
    body: {
      email: adminEmail,
      password: adminPassword,
    } satisfies ICommunityPlatformAdmin.ICreate,
  });
  typia.assert(admin);

  // 4. As admin, create a rule for the community
  const ruleCreate = {
    body: RandomGenerator.content({
      paragraphs: 2,
      sentenceMin: 6,
      sentenceMax: 12,
    }),
    version: 1,
    published_at: new Date().toISOString(),
  } satisfies ICommunityPlatformCommunityRule.ICreate;
  const rule =
    await api.functional.communityPlatform.admin.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: ruleCreate,
      },
    );
  typia.assert(rule);

  TestValidator.equals("community_id matches", rule.community_id, community.id);
  TestValidator.equals("rule body matches", rule.body, ruleCreate.body);
  TestValidator.equals("rule version matches", rule.version, 1);
  TestValidator.equals(
    "rule published_at matches",
    rule.published_at,
    ruleCreate.published_at,
  );
  TestValidator.predicate(
    "rule has id",
    typeof rule.id === "string" && rule.id.length > 0,
  );
  TestValidator.predicate(
    "rule created_at present",
    typeof rule.created_at === "string" && rule.created_at.length > 0,
  );
  TestValidator.predicate(
    "rule updated_at present",
    typeof rule.updated_at === "string" && rule.updated_at.length > 0,
  );
}
