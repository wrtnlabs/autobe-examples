import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_viewing_complete(
  connection: api.IConnection,
): Promise<void> {
  // 1. Generate a random memberId for profile retrieval
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // 2. Retrieve the user's public profile
  const profile = await api.functional.redditCommunity.members.profile.at(
    connection,
    { memberId },
  );
  // 3. Validate the complete response structure using typia.assert
  // This validates all field types: id (uuid), display_name (string),
  // bio (nullable string), avatar_image_url (nullable URI),
  // karma_score (int32), created_at (date-time)
  typia.assert(profile);
  // 4. Validate required field values
  TestValidator.equals("profile id exists", profile.id !== undefined, true);
  TestValidator.equals(
    "display_name is non-empty string",
    profile.display_name.length > 0,
    true,
  );
  TestValidator.equals(
    "karma_score is number",
    typeof profile.karma_score === "number",
    true,
  );
  TestValidator.equals(
    "created_at is non-empty string",
    profile.created_at.length > 0,
    true,
  );
  // 5. Validate bio is either undefined, null, or string
  if (profile.bio !== undefined && profile.bio !== null) {
    TestValidator.predicate(
      "bio is string when not null",
      typeof profile.bio === "string",
    );
  }
  // 6. Validate avatar_image_url is either undefined, null, or valid URI
  // (typia.assert already validates URI format, so we only check presence)
  if (
    profile.avatar_image_url !== undefined &&
    profile.avatar_image_url !== null
  ) {
    TestValidator.predicate(
      "avatar_image_url exists when present",
      profile.avatar_image_url.length > 0,
    );
  }
  // 7. Validate karma_score is within int32 range
  TestValidator.predicate(
    "karma_score is within int32 range",
    profile.karma_score >= -2147483648 && profile.karma_score <= 2147483647,
  );
}
