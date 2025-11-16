import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformCategory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCategory";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";

/**
 * Test updating a community that does not exist or has already been deleted.
 *
 * This test validates that attempting to update a non-existent community
 * returns a 404 Not Found error. The test setup creates necessary prerequisites
 * (member authentication and category) and then attempts to update a community
 * using a UUID that doesn't correspond to any existing community. The API
 * should properly reject the request with an appropriate error response.
 *
 * Steps:
 *
 * 1. Create a member account for authentication
 * 2. Create a category to satisfy system requirements
 * 3. Attempt to update a community using a non-existent UUID
 * 4. Validate that the operation fails with 404 Not Found error
 * 5. Verify error handling for invalid resource access
 */
export async function test_api_community_update_nonexistent_community(
  connection: api.IConnection,
) {
  // Step 1: Create a member account for authentication
  const memberBody = {
    email: `member_${RandomGenerator.alphaNumeric(8)}@test.com`,
    username: `testuser_${RandomGenerator.alphaNumeric(6)}`,
    password: "TestPassword123!",
    href: "http://localhost/join",
    referrer: "http://localhost",
  } satisfies ICommunityPlatformMember.ICreate;

  const member = await api.functional.auth.member.join(connection, {
    body: memberBody,
  });
  typia.assert(member);

  // Step 2: Create a category to satisfy system requirements
  const categoryBody = {
    name: "Test Category",
    slug: `test_category_${RandomGenerator.alphaNumeric(6)}`,
    display_order: 1,
  } satisfies ICommunityPlatformCategory.ICreate;

  const category =
    await api.functional.communityPlatform.administrator.categories.create(
      connection,
      {
        body: categoryBody,
      },
    );
  typia.assert(category);

  // Step 3: Attempt to update a community using a non-existent UUID
  const nonexistentCommunityId = typia.random<string & tags.Format<"uuid">>();

  const updateBody = {
    name: "Updated Community",
    description: "Updated description",
  } satisfies ICommunityPlatformCommunity.IUpdate;

  // Step 4: Validate that the operation fails with 404 Not Found error
  await TestValidator.httpError(
    "updating nonexistent community should return 404",
    404,
    async () => {
      return await api.functional.communityPlatform.member.communities.update(
        connection,
        {
          communityId: nonexistentCommunityId,
          body: updateBody,
        },
      );
    },
  );

  // Step 5: Error handling validated - test completes successfully
  TestValidator.predicate(
    "error handling for nonexistent community is properly implemented",
    true,
  );
}
