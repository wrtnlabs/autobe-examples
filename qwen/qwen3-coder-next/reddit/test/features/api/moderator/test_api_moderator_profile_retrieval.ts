import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditLikeModerator } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditLikeModerator";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_moderator_profile_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Generate a random moderator profile for testing
  const generatedModerator = typia.random<IRedditLikeModerator>();
  typia.assert(generatedModerator);
  // Retrieve the moderator profile using the generated ID
  const retrievedModerator = await api.functional.redditLike.moderators.at(
    connection,
    {
      moderatorId: generatedModerator.id,
    },
  );
  typia.assert(retrievedModerator);
  // Validate all required fields match the expected structure
  TestValidator.equals(
    "id matches",
    retrievedModerator.id,
    generatedModerator.id,
  );
  TestValidator.equals(
    "email matches",
    retrievedModerator.email,
    generatedModerator.email,
  );
  TestValidator.equals(
    "username matches",
    retrievedModerator.username,
    generatedModerator.username,
  );
  TestValidator.equals(
    "display_name matches",
    retrievedModerator.display_name,
    generatedModerator.display_name,
  );
  TestValidator.equals(
    "bio matches",
    retrievedModerator.bio,
    generatedModerator.bio,
  );
  TestValidator.equals(
    "avatar_url matches",
    retrievedModerator.avatar_url,
    generatedModerator.avatar_url,
  );
  TestValidator.equals(
    "karma_score matches",
    retrievedModerator.karma_score,
    generatedModerator.karma_score,
  );
  TestValidator.equals(
    "created_at matches",
    retrievedModerator.created_at,
    generatedModerator.created_at,
  );
  TestValidator.equals(
    "updated_at matches",
    retrievedModerator.updated_at,
    generatedModerator.updated_at,
  );
  TestValidator.equals(
    "deleted_at matches",
    retrievedModerator.deleted_at,
    generatedModerator.deleted_at,
  );
}
