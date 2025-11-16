import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";

/**
 * Validate public retrieval of a community moderation/content rule by code.
 *
 * - Anyone can get the details of an enforced rule in a given community using the
 *   community name (slug) and the rule's unique code.
 * - If the rule is not enforced, access must be restricted for anonymous users
 *   (should error).
 * - Response must include all required ICommunityPlatformCommunityRule fields.
 * - Attempting to retrieve a rule with a non-existent community or a missing rule
 *   code must return an error.
 *
 * Test workflow:
 *
 * 1. Generate a random community name and enforced rule code, and insert an
 *    enforced rule (simulate creation step with typia.random, as only read
 *    endpoint is available).
 * 2. Retrieve existing enforced rule by community name and rule code: should
 *    succeed, check complete structure.
 * 3. Insert a non-enforced rule and retrieve by code: should fail for
 *    unauthenticated users.
 * 4. Try requesting with a non-existent community name: should error.
 * 5. Try requesting with a real community name and non-existent rule code: should
 *    error.
 */
export async function test_api_community_rule_detail_retrieval_public(
  connection: api.IConnection,
) {
  // Generate enforced rule data
  const enforcedRule: ICommunityPlatformCommunityRule =
    typia.random<ICommunityPlatformCommunityRule>();
  // Simulate as if this rule actually exists (since only read endpoint is available).

  // 1. Retrieve an enforced rule (should be accessible anonymously)
  const publicRule =
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityName: enforcedRule.community.name,
      ruleCode: enforcedRule.code,
    });
  typia.assert(publicRule);
  TestValidator.equals("enforced rule id", publicRule.id, enforcedRule.id);
  TestValidator.equals(
    "enforced rule code",
    publicRule.code,
    enforcedRule.code,
  );
  TestValidator.equals(
    "enforced rule description",
    publicRule.description,
    enforcedRule.description,
  );
  TestValidator.equals(
    "enforced rule enforced flag is true",
    publicRule.enforced,
    true,
  );
  TestValidator.equals(
    "enforced rule display_order",
    publicRule.display_order,
    enforcedRule.display_order,
  );
  TestValidator.equals(
    "enforced rule community name matches",
    publicRule.community.name,
    enforcedRule.community.name,
  );
  TestValidator.equals(
    "enforced rule created_at",
    publicRule.created_at,
    enforcedRule.created_at,
  );
  TestValidator.equals(
    "enforced rule updated_at",
    publicRule.updated_at,
    enforcedRule.updated_at,
  );

  // 2. Try to retrieve a non-enforced rule (should fail for unauthenticated)
  const nonEnforcedRule: ICommunityPlatformCommunityRule = {
    ...typia.random<ICommunityPlatformCommunityRule>(),
    enforced: false,
    community: enforcedRule.community,
  };
  await TestValidator.error(
    "cannot access non-enforced rule without authentication",
    async () => {
      await api.functional.communityPlatform.communities.rules.at(connection, {
        communityName: nonEnforcedRule.community.name,
        ruleCode: nonEnforcedRule.code,
      });
    },
  );

  // 3. Try to retrieve with non-existent community name
  await TestValidator.error("error if community does not exist", async () => {
    await api.functional.communityPlatform.communities.rules.at(connection, {
      communityName: RandomGenerator.alphaNumeric(12),
      ruleCode: enforcedRule.code,
    });
  });

  // 4. Try to retrieve with non-existent rule code in an existing community
  await TestValidator.error(
    "error if rule code does not exist in existing community",
    async () => {
      await api.functional.communityPlatform.communities.rules.at(connection, {
        communityName: enforcedRule.community.name,
        ruleCode: RandomGenerator.alphaNumeric(10),
      });
    },
  );
}
