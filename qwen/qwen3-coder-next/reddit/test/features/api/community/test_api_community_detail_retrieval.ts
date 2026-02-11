import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Test 1: Retrieve community details with valid community ID
  // Generate a mock community object using typia.random
  const mockCommunity = typia.random<IRedditPlatformCommunity>();
  const retrievedCommunity = await api.functional.redditPlatform.communities.at(
    connection,
    {
      communityId: mockCommunity.id,
    },
  );
  typia.assert(retrievedCommunity);
  // Validate essential community properties
  TestValidator.equals(
    "community ID matches",
    retrievedCommunity.id,
    mockCommunity.id,
  );
  TestValidator.predicate(
    "has valid name",
    typeof retrievedCommunity.name === "string",
  );
  TestValidator.predicate(
    "subscriber count is non-negative",
    retrievedCommunity.subscriber_count >= 0,
  );
  TestValidator.predicate(
    "has valid created_at timestamp",
    !isNaN(Date.parse(retrievedCommunity.created_at)),
  );
  TestValidator.predicate(
    "has valid updated_at timestamp",
    !isNaN(Date.parse(retrievedCommunity.updated_at)),
  );
  // Test 2: Validate owner information is present
  TestValidator.equals(
    "owner is available",
    retrievedCommunity.owner !== null && retrievedCommunity.owner !== undefined,
    true,
  );
  TestValidator.equals(
    "owner has valid ID",
    typeof retrievedCommunity.owner.id === "string",
    true,
  );
  TestValidator.equals(
    "owner has valid username",
    typeof retrievedCommunity.owner.username === "string",
    true,
  );
}
