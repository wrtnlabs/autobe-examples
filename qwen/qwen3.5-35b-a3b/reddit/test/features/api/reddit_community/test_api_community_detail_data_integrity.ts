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

export async function test_api_community_detail_data_integrity(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a random community ID for testing
  const communityId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Fetch community details
  const community = await api.functional.redditCommunity.communities.at(
    connection,
    { communityId },
  );
  typia.assert(community);
  // 3. Validate subscriber_count is a valid int32
  TestValidator.predicate(
    "subscriber_count is non-negative int32",
    community.subscriber_count >= 0,
  );
  // 4. Validate timestamps are ISO 8601 format (verified by typia.assert)
  // created_at and updated_at must be valid date-time strings
  typia.assert(community.created_at);
  typia.assert(community.updated_at);
  // 5. Validate owner reference
  const owner = community.owner;
  typia.assert(owner);
  TestValidator.predicate(
    "owner has valid id",
    owner.id !== null && owner.id !== undefined,
  );
  TestValidator.predicate(
    "owner has username",
    owner.username !== null && owner.username !== undefined,
  );
  TestValidator.predicate(
    "owner has created_at",
    owner.created_at !== null && owner.created_at !== undefined,
  );
  // 6. Validate owner profile if exists
  if (owner.profile !== null && owner.profile !== undefined) {
    const profile = owner.profile;
    typia.assert(profile);
    TestValidator.predicate(
      "profile has display_name",
      profile.display_name !== null && profile.display_name !== undefined,
    );
    TestValidator.predicate(
      "profile has karma_score",
      profile.karma_score !== null && profile.karma_score !== undefined,
    );
    TestValidator.predicate(
      "profile has created_at",
      profile.created_at !== null && profile.created_at !== undefined,
    );
    // If avatar exists, validate URI format
    if (
      profile.avatar_image_url !== null &&
      profile.avatar_image_url !== undefined
    ) {
      typia.assert(profile.avatar_image_url);
    }
  }
  // 7. Validate soft delete timestamp if exists
  if (community.deleted_at !== null) {
    typia.assert(community.deleted_at);
  }
}
