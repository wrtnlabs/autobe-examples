import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_get_details_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random UUID for community testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Call the community details endpoint (public, no auth required)
  const community = await api.functional.redditPlatform.communities.at(
    connection,
    {
      communityId,
    },
  );
  typia.assert(community);
  // Validate name is present and non-empty
  TestValidator.predicate("community has name", community.name.length > 0);
  // Validate description is optional (can be null or undefined)
  if (community.description !== undefined) {
    TestValidator.predicate(
      "description is string or null",
      typeof community.description === "string" ||
        community.description === null,
    );
  }
  // Validate iconUrl is optional URI format
  if (community.iconUrl !== undefined) {
    typia.assert(community.iconUrl);
  }
  // Validate subscriber count is non-negative int32
  const subscriberCount = community.subscriberCount satisfies number;
  TestValidator.predicate(
    "subscriber count is non-negative",
    subscriberCount >= 0,
  );
  // Validate timestamps are valid date-time format
  TestValidator.predicate(
    "created at is valid date-time",
    !isNaN(Date.parse(community.createdAt)),
  );
  TestValidator.predicate(
    "updated at is valid date-time",
    !isNaN(Date.parse(community.updatedAt)),
  );
  // Validate community is active (deletedAt should be null for active community)
  TestValidator.equals(
    "community is active (not deleted)",
    community.deletedAt,
    null,
  );
  // Validate owner information
  TestValidator.predicate(
    "owner ID is valid UUID",
    community.owner.id.length === 36,
  );
  TestValidator.predicate(
    "owner has username",
    community.owner.username.length > 0,
  );
  TestValidator.predicate(
    "owner has display name",
    community.owner.display_name.length > 0,
  );
  TestValidator.predicate(
    "owner has karma score",
    typeof community.owner.karma_score === "number",
  );
  TestValidator.predicate(
    "owner created at is valid date-time",
    !isNaN(Date.parse(community.owner.created_at)),
  );
  // Verify all IRedditPlatformCommunity required fields are present
  TestValidator.predicate(
    "community has all required fields",
    community.id !== undefined &&
      community.name !== undefined &&
      community.createdAt !== undefined &&
      community.updatedAt !== undefined,
  );
  // Verify owner has all required ISummary fields
  TestValidator.predicate(
    "owner has all required fields",
    community.owner.id !== undefined &&
      community.owner.username !== undefined &&
      community.owner.display_name !== undefined,
  );
}
