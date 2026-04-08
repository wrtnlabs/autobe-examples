import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

/**
 * Test retrieving an existing community by its unique identifier.
 *
 * Validates the complete community retrieval flow including response structure, field types, and owner information. Ensures that the community entity contains all expected fields with correct types and that the owner profile summary is properly populated.
 *
 * Special attention is given to verifying that the response structure matches the IRedditCloneCommunity DTO, the owner field contains a valid IRedditCloneUserProfile.ISummary, and all required fields are present.
 *
 * 1. Community is retrieved using its unique identifier via the GET endpoint (available to all users including guests).
 * 2. Validates all community fields including id, name, description, icon, subscriber_count, and timestamps using typia.assert.
 * 3. Verifies the owner field contains a valid user profile summary with display_name, bio, avatar, karma, and created_at.
 * 4. Confirms business logic: subscriber_count is non-negative, owner karma is non-negative, and owner display_name is non-empty.
 */
export async function test_api_community_retrieve_existing(
  connection: api.IConnection,
): Promise<void> {
  // 1. Retrieve an existing community (using a known community ID from test environment)
  // Note: This test assumes the test environment has pre-seeded communities
  const retrieved = await api.functional.redditClone.communities.at(
    connection,
    {
      communityId: "00000000-0000-0000-0000-000000000001",
    },
  );
  typia.assert(retrieved);
  // 2. Validate community business logic fields
  TestValidator.predicate(
    "subscriber_count is non-negative",
    retrieved.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "owner display_name is non-empty",
    retrieved.owner.display_name.length > 0,
  );
  TestValidator.predicate(
    "owner karma is non-negative",
    retrieved.owner.karma >= 0,
  );
  // 3. Validate optional fields
  TestValidator.predicate(
    "icon is null or valid URI",
    retrieved.icon === null || /^https?:\/\/.+/i.test(retrieved.icon),
  );
  TestValidator.predicate(
    "owner bio can be null",
    retrieved.owner.bio === null || typeof retrieved.owner.bio === "string",
  );
  TestValidator.predicate(
    "owner avatar can be null",
    retrieved.owner.avatar === null ||
      /^https?:\/\/.+/i.test(retrieved.owner.avatar),
  );
  TestValidator.equals(
    "deleted_at is null for active community",
    retrieved.deleted_at,
    null,
  );
}
