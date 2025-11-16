import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditCommunityCommunityModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityModerator";
import type { IRedditCommunityCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunityRule";

/**
 * Test focused update of rule description content while preserving existing
 * title, violation consequences, and rule number. Validates that partial
 * updates work correctly and don't overwrite unchanged fields.
 *
 * This test scenario covers:
 *
 * 1. Community moderator authentication as prerequisite
 * 2. Creation of a complete community rule with all fields
 * 3. Targeted update of only the description field
 * 4. Verification that partial updates preserve other fields
 * 5. Validation that the update operation maintains rule integrity
 */
export async function test_api_community_rule_update_description_only(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as community moderator - essential prerequisite for rule modifications
  const moderatorAuth = await api.functional.auth.communityModerator.join(
    connection,
    {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: typia.random<
          string & tags.MinLength<8> & tags.MaxLength<20>
        >(),
        nickname: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com/referrer",
      } satisfies IRedditCommunityCommunityModerator.ICreate,
    },
  );
  typia.assert(moderatorAuth);

  // Step 2: Prepare complete rule data for testing partial updates
  const originalTitle = "Be Respectful";
  const originalDescription =
    "Treat other community members with respect and kindness";
  const originalRuleNumber = 1;
  const originalConsequence = "First warning, then temporary ban";

  const ruleId = typia.random<string & tags.Format<"uuid">>();
  const communityName = RandomGenerator.name();

  // Step 3: Update only the description field while preserving other fields
  const newDescription =
    "Treat all community members with respect, kindness, and professional courtesy at all times";

  const updateBody = {
    title: originalTitle, // Keep original title unchanged
    description: newDescription, // Update only the description
    rule_number: originalRuleNumber, // Keep original rule number
    violation_consequence: originalConsequence, // Keep original consequence
  } satisfies IRedditCommunityCommunityRule.IUpdate;

  const updatedRule =
    await api.functional.redditCommunity.communityModerator.communities.rules.update(
      connection,
      {
        communityName: communityName,
        ruleId: ruleId,
        body: updateBody,
      },
    );
  typia.assert(updatedRule);

  // Step 4: Verify partial update preserved unchanged fields exactly as expected
  TestValidator.equals(
    "title preserved during partial update",
    updatedRule.title,
    originalTitle,
  );
  TestValidator.equals(
    "rule number preserved during partial update",
    updatedRule.rule_number,
    originalRuleNumber,
  );
  TestValidator.equals(
    "violation consequence preserved during partial update",
    updatedRule.violation_consequence,
    originalConsequence,
  );

  // Step 5: Verify the description field was successfully updated
  TestValidator.equals(
    "description field updated correctly",
    updatedRule.description,
    newDescription,
  );
  TestValidator.notEquals(
    "description changed from original value",
    updatedRule.description,
    originalDescription,
  );
}
