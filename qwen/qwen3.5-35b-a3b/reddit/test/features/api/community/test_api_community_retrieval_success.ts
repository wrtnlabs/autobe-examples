import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a valid community name (alphanumeric, 8-15 characters)
  const communityName = RandomGenerator.alphaNumeric(8);
  // 2. Call GET /redditPlatform/communities/{name} with the generated name
  // Create actor-specific connection (never use base connection directly)
  const clientConnection: api.IConnection = { host: connection.host };
  const response = await api.functional.redditPlatform.communities.at(
    clientConnection,
    { name: communityName },
  );
  // 3. Validate the response structure using typia.assert()
  typia.assert(response);
  // 4. Verify the returned name matches the requested name exactly
  TestValidator.equals(
    "community name matches request",
    response.name,
    communityName,
  );
  // 5. Validate owner summary structure and relationships
  typia.assert(response.owner);
  TestValidator.equals(
    "owner id is non-empty",
    response.owner.id.length > 0,
    true,
  );
  TestValidator.equals(
    "owner username is non-empty",
    response.owner.username.length > 0,
    true,
  );
  // 6. Verify owner created_at is valid datetime format
  const ownerCreatedAtDate = new Date(response.owner.created_at);
  TestValidator.predicate(
    "owner created_at is valid ISO 8601",
    () => !isNaN(ownerCreatedAtDate.getTime()),
  );
  // 7. Validate community timestamps are valid ISO 8601 format
  const createdAtDate = new Date(response.created_at);
  const updatedAtDate = new Date(response.updated_at);
  TestValidator.predicate(
    "created_at is valid ISO 8601",
    () => !isNaN(createdAtDate.getTime()),
  );
  TestValidator.predicate(
    "updated_at is valid ISO 8601",
    () => !isNaN(updatedAtDate.getTime()),
  );
  // 8. Validate that deleted_at is null (community is active)
  TestValidator.equals(
    "deleted_at is null for active community",
    response.deleted_at,
    null,
  );
  // 9. Verify all count fields are non-negative integers
  TestValidator.equals(
    "subscribers_count is non-negative",
    response.subscribers_count >= 0,
    true,
  );
  TestValidator.equals(
    "posts_count is non-negative",
    response.posts_count >= 0,
    true,
  );
  TestValidator.equals(
    "comments_count is non-negative",
    response.comments_count >= 0,
    true,
  );
  // 10. Validate community id is non-empty UUID
  TestValidator.equals(
    "community id is non-empty",
    response.id.length > 0,
    true,
  );
  // 11. Validate community name length is within expected range (3-50 characters)
  TestValidator.predicate(
    "community name length is valid",
    () => response.name.length >= 3 && response.name.length <= 50,
  );
}
