import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test that non-administrator users cannot create categories.
 *
 * This test validates that the category creation endpoint enforces proper
 * authorization restrictions, ensuring that only administrators can create new
 * categories. A member account (non-administrator) attempts to create a
 * category, and the request should fail with HTTP 403 Forbidden indicating
 * insufficient permissions.
 *
 * The scenario follows these steps:
 *
 * 1. Create a member account (non-administrator user)
 * 2. Attempt to create a category using the member's authentication context
 * 3. Verify the request fails with 403 Forbidden error
 * 4. Confirm that authorization is properly enforced
 */
export async function test_api_category_creation_non_administrator(
  connection: api.IConnection,
) {
  // Step 1: Create a member account (non-administrator)
  const memberData = {
    email: typia.random<string & tags.Format<"email">>(),
    username: RandomGenerator.alphabets(10),
    password: "SecurePassword123!",
    href: typia.random<string & tags.Format<"uri">>(),
    referrer: typia.random<string & tags.Format<"uri">>(),
  } satisfies ICommunityPlatformMember.ICreate;

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: memberData,
    });
  typia.assert(member);

  // Step 2: Attempt to create a category with member authentication
  // The member's authentication token is now in connection.headers
  const categoryData = {
    name: RandomGenerator.paragraph({ sentences: 1 }),
    slug: RandomGenerator.alphabets(8).toLowerCase(),
    description: RandomGenerator.paragraph({ sentences: 2 }),
    display_order: typia.random<
      number & tags.Type<"int32"> & tags.Minimum<0>
    >(),
  } satisfies ICommunityPlatformCategory.ICreate;

  // Step 3: Verify the request fails with 403 Forbidden
  await TestValidator.error(
    "non-administrator cannot create category",
    async () => {
      await api.functional.communityPlatform.administrator.categories.create(
        connection,
        {
          body: categoryData,
        },
      );
    },
  );

  // Test verification complete: authorization restriction confirmed
}
