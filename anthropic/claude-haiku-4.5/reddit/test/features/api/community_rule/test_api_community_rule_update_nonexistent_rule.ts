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
 * Test that updating a non-existent rule returns appropriate error.
 *
 * This test validates that the API correctly returns HTTP 404 Not Found when
 * attempting to update a rule using a valid community ID but an
 * invalid/non-existent rule ID (a UUID that was never created). The test
 * ensures the system properly handles update requests for rules that do not
 * exist in the specified community.
 *
 * Test flow:
 *
 * 1. Create an administrator account
 * 2. Create a category for community classification
 * 3. Create a member account
 * 4. Create a community as the member
 * 5. Attempt to update a non-existent rule with a fake UUID
 * 6. Validate that HTTP 404 error is returned
 */
export async function test_api_community_rule_update_nonexistent_rule(
  connection: api.IConnection,
) {
  // 1. Create administrator account
  const admin = await api.functional.auth.administrator.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphabets(12),
      username: RandomGenerator.alphabets(8),
      name: RandomGenerator.name(),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformAdministrator.ICreate,
  });
  typia.assert(admin);

  // Switch to administrator connection
  const adminConnection = { ...connection };
  adminConnection.headers ??= {};
  adminConnection.headers.Authorization = admin.token.access;

  // 2. Create a category for community
  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          slug: RandomGenerator.alphabets(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph(),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create member account
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      username: RandomGenerator.alphabets(8),
      password: RandomGenerator.alphabets(12),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.ICreate,
  });
  typia.assert(member);

  // Switch to member connection
  const memberConnection = { ...connection };
  memberConnection.headers ??= {};
  memberConnection.headers.Authorization = member.token.access;

  // 4. Create a community
  const community =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: RandomGenerator.name(2),
          identifier: RandomGenerator.alphabets(10).toLowerCase(),
          description: RandomGenerator.paragraph(),
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Attempt to update a non-existent rule with a fake UUID
  const fakeRuleId = typia.random<string & tags.Format<"uuid">>();

  // 6. Validate that HTTP 404 error is returned
  await TestValidator.httpError(
    "updating non-existent rule should return 404",
    404,
    async () => {
      return await api.functional.communityPlatform.member.communities.rules.update(
        memberConnection,
        {
          communityId: community.id,
          ruleId: fakeRuleId,
          body: {
            title: RandomGenerator.paragraph({ sentences: 1 }),
            description: RandomGenerator.paragraph({ sentences: 2 }),
          } satisfies ICommunityPlatformCommunityRule.IUpdate,
        },
      );
    },
  );
}
