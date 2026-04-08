import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCloneCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunity";
import type { IRedditCloneCommunityIcon } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneCommunityIcon";
import type { IRedditCloneFile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFile";
import type { IRedditCloneFileThumbnail } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneFileThumbnail";
import type { IRedditCloneMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCloneMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_retrieval_without_icon(
  connection: api.IConnection,
): Promise<void> {
  // Test retrieving community details when the community does not have an icon image set.
  // This validates the LEFT JOIN behavior for icon relationship.
  // Create guest connection for public community access
  const guestConnection: api.IConnection = { host: connection.host };
  // Generate a valid UUID for testing
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Call GET /redditClone/communities/{communityId} endpoint
  const community = await api.functional.redditClone.communities.at(
    guestConnection,
    {
      communityId,
    },
  );
  // Validate response with typia.assert - performs complete type validation
  // This validates all fields including icon relationship
  typia.assert(community);
  // Validate required fields are present
  TestValidator.predicate(
    "community has valid name",
    community.name.length > 0,
  );
  TestValidator.predicate(
    "community has valid description",
    community.description.length > 0,
  );
  TestValidator.predicate(
    "subscriberCount is non-negative",
    community.subscriberCount >= 0,
  );
  TestValidator.predicate("owner has valid id", community.owner.id.length > 0);
  TestValidator.predicate(
    "owner has valid username",
    community.owner.username.length > 0,
  );
  TestValidator.predicate(
    "createdAt is valid date-time",
    community.createdAt.includes("T"),
  );
  TestValidator.predicate(
    "updatedAt is valid date-time",
    community.updatedAt.includes("T"),
  );
}
