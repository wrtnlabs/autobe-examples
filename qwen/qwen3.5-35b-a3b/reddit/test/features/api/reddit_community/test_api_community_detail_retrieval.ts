import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityCommunity";
import type { IRedditCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityMember";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_detail_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a valid community UUID (simulated by using typia.random with UUID format)
  const communityId = typia.random<string & tags.Format<"uuid">>();
  // Retrieve community details without authentication (public endpoint)
  const community = await api.functional.redditCommunity.communities.at(
    connection,
    { communityId },
  );
  typia.assert(community);
  // Validate subscriber_count is non-negative (business logic)
  TestValidator.predicate(
    "subscriber_count is non-negative",
    community.subscriber_count >= 0,
  );
  // Validate timestamp ordering (business logic: created_at should be before updated_at)
  const createdAt = new Date(community.created_at);
  const updatedAt = new Date(community.updated_at);
  TestValidator.predicate(
    "created_at is before or equal to updated_at",
    createdAt <= updatedAt,
  );
  // Validate soft-deletion timestamp (nullable date-time or null)
  if (community.deleted_at !== null) {
    const deletedAt = new Date(community.deleted_at);
    TestValidator.predicate(
      "deleted_at is valid date when not null",
      !isNaN(deletedAt.getTime()),
    );
  }
  // Validate owner reference has required fields
  TestValidator.notEquals("owner has id", community.owner.id, undefined);
  TestValidator.notEquals(
    "owner has username",
    community.owner.username,
    undefined,
  );
  TestValidator.notEquals(
    "owner has created_at",
    community.owner.created_at,
    undefined,
  );
  // Validate optional profile summary if present
  if (
    community.owner.profile !== undefined &&
    community.owner.profile !== null
  ) {
    TestValidator.notEquals(
      "profile has display_name",
      community.owner.profile.display_name,
      undefined,
    );
    TestValidator.notEquals(
      "profile has id",
      community.owner.profile.id,
      undefined,
    );
    TestValidator.notEquals(
      "profile has karma_score",
      community.owner.profile.karma_score,
      undefined,
    );
    TestValidator.notEquals(
      "profile has created_at",
      community.owner.profile.created_at,
      undefined,
    );
  }
  // Validate optional karma field on owner
  if (community.owner.karma !== undefined) {
    TestValidator.predicate(
      "karma is number when present",
      typeof community.owner.karma === "number",
    );
  }
  // Validate description is optional (can be undefined, null, or string)
  if (community.description !== undefined) {
    TestValidator.predicate(
      "description is string or null when present",
      typeof community.description === "string" ||
        community.description === null,
    );
  }
}
