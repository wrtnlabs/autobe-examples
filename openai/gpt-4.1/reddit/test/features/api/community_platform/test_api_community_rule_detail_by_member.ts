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
 * Validate retrieval of a single community rule by an authenticated member.
 *
 * Test process:
 *
 * 1. Register a new member (to enable community creation and later rule retrieval)
 * 2. Create a community as this member
 * 3. Register as a moderator for the same community (using the same email/password
 *    and the new communityId)
 * 4. As moderator, create a rule for the community (with random body/version/date)
 * 5. As member, retrieve the rule using the member/communities/rules/at API
 * 6. Validate all returned rule fields are correct
 * 7. Attempt with non-existent ruleId and unrelated communityId to check for error
 *    responses
 */
export async function test_api_community_rule_detail_by_member(
  connection: api.IConnection,
) {
  // Step 1: Register member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = RandomGenerator.alphaNumeric(12);
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword,
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Step 2: Member creates a community
  const communityInput = {
    name: RandomGenerator.alphaNumeric(10),
    title: RandomGenerator.paragraph({ sentences: 3 }),
    description: RandomGenerator.content({ paragraphs: 2 }),
    slug: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformCommunity.ICreate;
  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityInput,
      },
    );
  typia.assert(community);

  // Step 3: Register moderator for this community (use member email/password)
  const moderator = await api.functional.auth.moderator.join(connection, {
    body: {
      email: memberEmail,
      password: memberPassword as string & tags.Format<"password">,
      community_id: community.id,
    } satisfies ICommunityPlatformModerator.IJoin,
  });
  typia.assert(moderator);

  // Step 4: Moderator creates rule
  const ruleBody = RandomGenerator.content({ paragraphs: 2 });
  const ruleVersion = typia.random<number & tags.Type<"int32">>();
  const rulePubAt = new Date().toISOString();
  const ruleInput = {
    body: ruleBody,
    version: ruleVersion,
    published_at: rulePubAt,
  } satisfies ICommunityPlatformCommunityRule.ICreate;
  const rule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      connection,
      {
        communityId: community.id,
        body: ruleInput,
      },
    );
  typia.assert(rule);

  // Step 5: As member, retrieve the rule by id
  const retrieved =
    await api.functional.communityPlatform.member.communities.rules.at(
      connection,
      {
        communityId: community.id,
        ruleId: rule.id,
      },
    );
  typia.assert(retrieved);
  TestValidator.equals("rule id matches", retrieved.id, rule.id);
  TestValidator.equals(
    "community id matches",
    retrieved.community_id,
    community.id,
  );
  TestValidator.equals("body matches", retrieved.body, ruleInput.body);
  TestValidator.equals("version matches", retrieved.version, ruleInput.version);
  TestValidator.equals(
    "published_at matches",
    retrieved.published_at,
    ruleInput.published_at,
  );
  TestValidator.equals(
    "created_at matches",
    retrieved.created_at,
    rule.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrieved.updated_at,
    rule.updated_at,
  );

  // Step 6: Error scenario - non-existent ruleId
  await TestValidator.error("error on non-existent ruleId", async () => {
    await api.functional.communityPlatform.member.communities.rules.at(
      connection,
      {
        communityId: community.id,
        ruleId: typia.random<string & tags.Format<"uuid">>(),
      },
    );
  });
  // Step 7: Error scenario - unrelated communityId
  await TestValidator.error("error on wrong communityId", async () => {
    await api.functional.communityPlatform.member.communities.rules.at(
      connection,
      {
        communityId: typia.random<string & tags.Format<"uuid">>(),
        ruleId: rule.id,
      },
    );
  });
}
