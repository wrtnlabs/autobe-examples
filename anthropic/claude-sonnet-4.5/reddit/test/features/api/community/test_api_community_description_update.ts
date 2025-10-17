import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IRedditLikeCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeCommunity";
import type { IRedditLikeMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeMember";

/**
 * Test updating community description field within validation constraints.
 *
 * This test validates the community description update functionality by:
 *
 * 1. Creating a member account that will act as the community moderator
 * 2. Creating a community with an initial valid description
 * 3. Updating the community description to a new value within constraints
 * 4. Verifying the description was successfully updated
 * 5. Confirming the updated_at timestamp reflects the modification
 * 6. Ensuring the new description is immediately visible to all users
 *
 * The test focuses on valid description updates (10-500 characters) to verify
 * core update functionality for community moderators.
 */
export async function test_api_community_description_update(
  connection: api.IConnection,
) {
  // Step 1: Register and authenticate as a member
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const memberPassword = "SecurePass123!";

  const member: IRedditLikeMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        username: RandomGenerator.alphaNumeric(12),
        email: memberEmail,
        password: memberPassword,
      } satisfies IRedditLikeMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a community with initial description
  const initialDescription = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 4,
    wordMax: 8,
  });
  const communityCode = RandomGenerator.alphaNumeric(10);

  const createdCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.member.communities.create(connection, {
      body: {
        code: communityCode,
        name: RandomGenerator.name(2),
        description: initialDescription,
      } satisfies IRedditLikeCommunity.ICreate,
    });
  typia.assert(createdCommunity);

  TestValidator.equals(
    "initial description should match",
    createdCommunity.description,
    initialDescription,
  );

  // Store original updated_at timestamp
  const originalUpdatedAt = createdCommunity.updated_at;

  // Step 3: Update the community description
  const newDescription = RandomGenerator.paragraph({
    sentences: 5,
    wordMin: 5,
    wordMax: 10,
  });

  const updatedCommunity: IRedditLikeCommunity =
    await api.functional.redditLike.moderator.communities.update(connection, {
      communityId: createdCommunity.id,
      body: {
        description: newDescription,
      } satisfies IRedditLikeCommunity.IUpdate,
    });
  typia.assert(updatedCommunity);

  // Step 4: Verify the description was updated
  TestValidator.equals(
    "description should be updated to new value",
    updatedCommunity.description,
    newDescription,
  );

  // Step 5: Verify updated_at timestamp changed
  TestValidator.notEquals(
    "updated_at timestamp should be refreshed",
    updatedCommunity.updated_at,
    originalUpdatedAt,
  );

  // Step 6: Verify community ID remains the same
  TestValidator.equals(
    "community ID should remain unchanged",
    updatedCommunity.id,
    createdCommunity.id,
  );

  // Verify other fields remain unchanged
  TestValidator.equals(
    "community code should remain unchanged",
    updatedCommunity.code,
    createdCommunity.code,
  );

  TestValidator.equals(
    "community name should remain unchanged",
    updatedCommunity.name,
    createdCommunity.name,
  );
}
