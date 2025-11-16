import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test retrieval of a non-existent rule to verify proper error handling.
 *
 * This test validates that attempting to retrieve a community rule with a valid
 * community ID but an invalid/non-existent rule ID returns HTTP 404 Not Found.
 * The test ensures the API properly handles requests for rules that do not
 * exist and distinguishes this from malformed parameters or other errors.
 *
 * Steps:
 *
 * 1. Create an administrator account for category setup
 * 2. Create a category for community classification
 * 3. Create a member account to own the community
 * 4. Create a valid community within the category
 * 5. Attempt to retrieve a rule with valid community ID but non-existent rule ID
 * 6. Validate HTTP 404 error is returned
 */
export async function test_api_community_rule_retrieval_nonexistent_rule(
  connection: api.IConnection,
) {
  // Step 1: Create administrator account for category setup
  const adminData = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphabets(10),
    username: RandomGenerator.alphaNumeric(8),
    name: RandomGenerator.name(),
    href: "http://localhost:3000/admin",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformAdministrator.ICreate;

  const admin = await api.functional.auth.administrator.join(connection, {
    body: adminData,
  });
  typia.assert(admin);

  // Step 2: Create a category for community classification
  const categoryData = {
    name: "Technology",
    slug: "technology",
    description: "Tech community category",
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryData,
      },
    );
  typia.assert(category);

  // Step 3: Create a member account to own the community
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphaNumeric(8),
    password: RandomGenerator.alphabets(10),
    ip: "127.0.0.1",
    href: "http://localhost:3000/join",
    referrer: "http://localhost:3000",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberData,
  });
  typia.assert(member);

  // Step 4: Create a valid community within the category
  const communityData = {
    name: "Tech Discussions",
    identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
    description: "A community for tech discussions",
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community =
    await api.functional.communityPlatform.member.communities.create(
      connection,
      {
        body: communityData,
      },
    );
  typia.assert(community);

  // Step 5 & 6: Attempt to retrieve a non-existent rule and validate 404 error
  const nonExistentRuleId = typia.random<string & tags.Format<"uuid">>();

  await TestValidator.httpError(
    "should return 404 when retrieving non-existent rule",
    404,
    async () => {
      return await api.functional.communityPlatform.communities.rules.at(
        connection,
        {
          communityId: community.id,
          ruleId: nonExistentRuleId,
        },
      );
    },
  );
}
