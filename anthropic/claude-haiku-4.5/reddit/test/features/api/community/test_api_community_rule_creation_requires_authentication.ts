import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformCommunityRule } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunityRule";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformModerator";

/**
 * Test that rule creation requires moderator authentication and rejects
 * unauthenticated requests or requests from non-moderator roles.
 *
 * The test validates authorization boundaries by:
 *
 * 1. Verifying unauthenticated requests are rejected with 401 status
 * 2. Verifying member-level requests are rejected with 403 status (insufficient
 *    permissions)
 * 3. Confirming authenticated moderators can successfully create rules
 *
 * This ensures the API properly enforces role-based access control for
 * community rule creation.
 */
export async function test_api_community_rule_creation_requires_authentication(
  connection: api.IConnection,
) {
  // 1. Create administrator to set up test environment
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "TestPassword123!",
        username: RandomGenerator.alphabets(8),
        name: RandomGenerator.name(),
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // 2. Create a category for the community
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: {
          name: "Test Category",
          slug: `test-${RandomGenerator.alphaNumeric(6)}`,
          display_order: 1,
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // 3. Create a member account and authenticate as member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: `user_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 4. Create a community as a member
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${member.token.access}`,
    },
  };

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: {
          name: "Test Community",
          identifier: `test-${RandomGenerator.alphaNumeric(6)}`,
          visibility: "public",
          post_creation_restriction: "open_to_all",
          post_type_restriction: "all_types",
          category_slug: category.slug,
        } satisfies ICommunityPlatformCommunity.ICreate,
      },
    );
  typia.assert(community);

  // 5. Create a moderator account
  const moderatorEmail = typia.random<string & tags.Format<"email">>();
  const moderator: ICommunityPlatformModerator.IAuthorized =
    await api.functional.auth.moderator.join(connection, {
      body: {
        email: moderatorEmail,
        username: `mod_${RandomGenerator.alphaNumeric(6)}`,
        password: "TestPassword123!",
        href: "https://example.com",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformModerator.ICreate,
    });
  typia.assert(moderator);

  // 6. Test: Attempt to create a rule without authentication (should fail with 401)
  await TestValidator.httpError(
    "unauthenticated request should be rejected with 401",
    401,
    async () => {
      const unauthConnection: api.IConnection = {
        ...connection,
        headers: {},
      };
      await api.functional.communityPlatform.moderator.communities.rules.create(
        unauthConnection,
        {
          communityId: community.id,
          body: {
            rule_number: 1,
            title: "Test Rule",
            description: "This is a test rule",
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    },
  );

  // 7. Test: Attempt to create a rule as a member (should fail with 403)
  await TestValidator.httpError(
    "member authenticated request should be rejected with 403",
    403,
    async () => {
      await api.functional.communityPlatform.moderator.communities.rules.create(
        memberConnection,
        {
          communityId: community.id,
          body: {
            rule_number: 1,
            title: "Test Rule",
            description: "This is a test rule",
          } satisfies ICommunityPlatformCommunityRule.ICreate,
        },
      );
    },
  );

  // 8. Test: Create a rule as an authenticated moderator (should succeed)
  const moderatorConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${moderator.token.access}`,
    },
  };

  const rule: ICommunityPlatformCommunityRule =
    await api.functional.communityPlatform.moderator.communities.rules.create(
      moderatorConnection,
      {
        communityId: community.id,
        body: {
          rule_number: 1,
          title: "No Spam",
          description: "Do not post spam or promotional content",
        } satisfies ICommunityPlatformCommunityRule.ICreate,
      },
    );
  typia.assert(rule);

  // Verify the created rule
  TestValidator.equals("rule number matches", rule.rule_number, 1);
  TestValidator.equals("rule title matches", rule.title, "No Spam");
  TestValidator.equals(
    "rule belongs to correct community",
    rule.community_platform_community_id,
    community.id,
  );
}
