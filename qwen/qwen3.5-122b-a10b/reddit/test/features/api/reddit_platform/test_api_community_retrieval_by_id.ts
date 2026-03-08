import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunity";
import type { IRedditPlatformFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformFile";
import type { IRedditPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // Create guest connection for community retrieval (no authentication required)
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID for community retrieval
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve community details by ID
  const community: IRedditPlatformCommunity =
    await api.functional.redditPlatform.communities.at(guestConnection, {
      communityId,
    });
  // Validate complete type safety of response
  typia.assert(community);
  // Validate business logic - community data integrity
  TestValidator.equals(
    "community id matches request",
    community.id,
    communityId,
  );
  TestValidator.predicate(
    "community name is not empty",
    community.name.length > 0,
  );
  TestValidator.predicate(
    "subscriber count is non-negative",
    community.subscriberCount >= 0,
  );
  // Validate owner summary contains required information
  TestValidator.predicate(
    "owner has valid username",
    community.owner.username.length > 0,
  );
  TestValidator.predicate(
    "owner has karma score",
    typeof community.owner.karma_score === "number",
  );
  // Validate timestamps are present
  TestValidator.predicate(
    "createdAt timestamp exists",
    community.createdAt.length > 0,
  );
  TestValidator.predicate(
    "updatedAt timestamp exists",
    community.updatedAt.length > 0,
  );
  TestValidator.predicate(
    "owner created_at timestamp exists",
    community.owner.created_at.length > 0,
  );
}
