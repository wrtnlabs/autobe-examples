import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test community creation with proper required fields validation.
 *
 * Creates member and category resources, then successfully creates a community
 * with all required fields provided. Validates that the created community
 * contains the correct data matching the input request.
 *
 * Steps:
 *
 * 1. Register a new member account
 * 2. Create an administrator account
 * 3. Create a community category
 * 4. Create a community with all required fields
 * 5. Validate the created community matches the input data
 */
export async function test_api_community_creation_missing_required_fields(
  connection: api.IConnection,
) {
  // 1. Register a new member account
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        username: RandomGenerator.alphaNumeric(8),
        password: "TestPassword123!",
        href: "https://example.com/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformMember.ICreate,
    });
  typia.assert(member);

  // 2. Create an administrator account
  const adminEmail = typia.random<string & tags.Format<"email">>();
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: {
        email: adminEmail,
        password: "AdminPassword123!",
        username: RandomGenerator.alphaNumeric(8),
        name: RandomGenerator.name(),
        href: "https://example.com/admin/register",
        referrer: "https://example.com",
      } satisfies ICommunityPlatformAdministrator.ICreate,
    });
  typia.assert(admin);

  // Switch to admin connection for category creation
  const adminConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: admin.token.access,
    },
  };

  // 3. Create a community category
  const category: ICommunityPlatformCategory =
    await api.functional.communityPlatform.administrator.categories.create(
      adminConnection,
      {
        body: {
          name: RandomGenerator.paragraph({ sentences: 1 }),
          slug: RandomGenerator.alphaNumeric(10).toLowerCase(),
          display_order: 1,
          description: RandomGenerator.paragraph({ sentences: 2 }),
        } satisfies ICommunityPlatformCategory.ICreate,
      },
    );
  typia.assert(category);

  // Switch back to member connection
  const memberConnection: api.IConnection = {
    ...connection,
    headers: {
      ...connection.headers,
      Authorization: member.token.access,
    },
  };

  // 4. Create a community with all required fields
  const validCommunityBody = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    identifier: RandomGenerator.alphaNumeric(10).toLowerCase(),
    visibility: "public" as const,
    post_creation_restriction: "open_to_all" as const,
    post_type_restriction: "all_types" as const,
    category_slug: category.slug,
  } satisfies ICommunityPlatformCommunity.ICreate;

  const community: ICommunityPlatformCommunity =
    await api.functional.communityPlatform.member.communities.create(
      memberConnection,
      {
        body: validCommunityBody,
      },
    );
  typia.assert(community);

  // 5. Validate the created community matches the input data
  TestValidator.equals(
    "created community name matches input",
    community.name,
    validCommunityBody.name,
  );
  TestValidator.equals(
    "created community identifier matches input",
    community.identifier,
    validCommunityBody.identifier,
  );
  TestValidator.equals(
    "created community category slug matches input",
    community.category.slug,
    validCommunityBody.category_slug,
  );
  TestValidator.equals(
    "created community visibility matches input",
    community.visibility,
    validCommunityBody.visibility,
  );
}
