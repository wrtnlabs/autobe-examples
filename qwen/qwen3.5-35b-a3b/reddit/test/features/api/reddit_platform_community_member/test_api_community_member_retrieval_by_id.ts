import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditPlatformCommunityMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditPlatformCommunityMember";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_community_member_retrieval_by_id(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate test data using typia.random for community name and user ID
  // The API endpoint doesn't require authentication (authorization-type: null)
  const communityName = typia.random<string>();
  const userId = typia.random<string & tags.Format<"uuid">>();
  // 2. Retrieve community member record directly using base connection
  // Note: In simulation mode, this returns random mock data
  // In production mode, this queries the actual database
  const retrievedMember =
    await api.functional.redditPlatform.communities.members.at(connection, {
      name: communityName,
      userId,
    });
  // 3. Validate response type using typia.assert (full type validation)
  typia.assert(retrievedMember);
  // 4. Validate role is one of the allowed values
  TestValidator.predicate(
    "role is valid (owner, moderator, or member)",
    ["owner", "moderator", "member"].includes(retrievedMember.role),
  );
  // 5. Validate user_id and community_id are present
  TestValidator.predicate(
    "user_id is present",
    retrievedMember.user_id !== undefined,
  );
  TestValidator.predicate(
    "community_id is present",
    retrievedMember.community_id !== undefined,
  );
  // 6. Validate timestamps are valid ISO 8601 date-time format
  TestValidator.predicate(
    "joined_at is valid date-time",
    !isNaN(Date.parse(retrievedMember.joined_at)),
  );
  TestValidator.predicate(
    "created_at is valid date-time",
    !isNaN(Date.parse(retrievedMember.created_at)),
  );
  TestValidator.predicate(
    "updated_at is valid date-time",
    !isNaN(Date.parse(retrievedMember.updated_at)),
  );
  // 7. Validate deleted_at is null (active membership)
  TestValidator.equals(
    "deleted_at is null for active membership",
    retrievedMember.deleted_at,
    null,
  );
  // 8. Validate id is present
  TestValidator.predicate("id is present", retrievedMember.id !== undefined);
}
