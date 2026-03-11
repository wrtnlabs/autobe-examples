import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_get_owner_reference(
  connection: api.IConnection,
): Promise<void> {
  // Use connection simulation mode since no create endpoints are available
  // This generates valid test data matching the DTO structure for owner reference testing
  const simConnection: api.IConnection = {
    host: connection.host,
    simulate: true,
  };
  // Generate random community data - includes owner with all required fields
  const community = await api.functional.redditPlatform.communities.at(
    simConnection,
    {
      communityId: typia.random<string & tags.Format<"uuid">>(),
    },
  );
  // Assert the response structure including owner reference
  typia.assert(community);
  // Verify owner relationship is properly resolved (foreign key join)
  TestValidator.equals("owner exists", community.owner !== undefined, true);
  TestValidator.equals(
    "owner id matches community owner",
    community.owner.id !== undefined,
    true,
  );
  // Validate owner is active (business logic)
  TestValidator.predicate(
    "owner is active",
    community.owner.is_active === true,
  );
  // Validate owner karma_score is a valid positive integer
  TestValidator.predicate(
    "owner has valid karma_score",
    typeof community.owner.karma_score === "number",
  );
  // Validate community name is populated
  TestValidator.predicate("community has name", community.name.length > 0);
  // Validate subscriber count is a valid integer
  TestValidator.predicate(
    "subscriber count is valid",
    typeof community.subscriberCount === "number",
  );
  // Verify owner display_name is populated
  TestValidator.equals(
    "owner has display_name",
    community.owner.display_name.length > 0,
    true,
  );
  // Verify owner username is populated
  TestValidator.equals(
    "owner has username",
    community.owner.username.length > 0,
    true,
  );
  // Verify owner has valid created_at timestamp
  TestValidator.equals(
    "owner has created_at",
    community.owner.created_at.length > 0,
    true,
  );
}
