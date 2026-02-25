import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneOwner } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneOwner";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_retrieval_success(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random community ID for testing
  const communityId = typia.random<string & typia.tags.Format<"uuid">>();
  // Retrieve the community
  const community = await api.functional.redditClone.communities.at(
    connection,
    {
      communityId: communityId,
    },
  );
  // Validate the response
  typia.assert(community);
  // Verify community details
  if (community.name === undefined) {
    throw new Error("Community name is undefined");
  }
  if (community.id === undefined) {
    throw new Error("Community ID is undefined");
  }
  if (community.owner === undefined || community.owner.id === undefined) {
    throw new Error("Community owner information is incomplete");
  }
  if (community.createdAt === undefined) {
    throw new Error("Community createdAt is undefined");
  }
  if (community.updatedAt === undefined) {
    throw new Error("Community updatedAt is undefined");
  }
  // Validate date formats
  const createdAt = new Date(community.createdAt);
  const updatedAt = new Date(community.updatedAt);
  if (isNaN(createdAt.getTime())) {
    throw new Error("Invalid createdAt date format");
  }
  if (isNaN(updatedAt.getTime())) {
    throw new Error("Invalid updatedAt date format");
  }
  // Validate subscriber count
  if (community.subscriberCount < 0) {
    throw new Error("Subscriber count cannot be negative");
  }
}
