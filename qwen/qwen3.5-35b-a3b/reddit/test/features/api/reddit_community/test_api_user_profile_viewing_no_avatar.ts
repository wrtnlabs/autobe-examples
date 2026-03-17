import api from "@ORGANIZATION/PROJECT-api";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IRedditCommunityUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/IRedditCommunityUserProfile";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

export async function test_api_user_profile_viewing_no_avatar(
  connection: api.IConnection,
): Promise<void> {
  // Create member connection for isolated API calls
  const memberConnection: api.IConnection = { host: connection.host };
  // Generate a valid member ID to query their profile
  const memberId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  // Fetch the user profile from the API
  const profile = await api.functional.redditCommunity.members.profile.at(
    memberConnection,
    { memberId },
  );
  typia.assert(profile);
  // Validate that all required fields are present in the profile
  TestValidator.predicate(
    "profile has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      profile.id,
    ),
  );
  TestValidator.equals(
    "profile has display_name",
    typeof profile.display_name,
    "string",
  );
  TestValidator.equals(
    "profile has karma_score",
    typeof profile.karma_score,
    "number",
  );
  TestValidator.equals(
    "profile has created_at",
    typeof profile.created_at,
    "string",
  );
  // Test case 1: Verify avatar_image_url can be null (user has no avatar)
  // This validates the API gracefully handles missing avatars
  if (profile.avatar_image_url === null) {
    TestValidator.equals(
      "avatar can be null when user has no uploaded image",
      profile.avatar_image_url,
      null,
    );
  }
  // Test case 2: Verify bio can also be null (user has no bio text)
  if (profile.bio === null || profile.bio === undefined) {
    TestValidator.equals(
      "bio can be null or undefined when user has no bio",
      profile.bio,
      undefined,
    );
  }
  // Test case 3: If avatar exists, validate it's a proper URI
  if (
    profile.avatar_image_url !== null &&
    profile.avatar_image_url !== undefined
  ) {
    typia.assert(profile.avatar_image_url as string & tags.Format<"uri">);
  }
}
