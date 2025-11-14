import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { ICommunityPlatformUserProfile } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserProfile";

export async function test_api_user_profile_retrieval(
  connection: api.IConnection,
) {
  // Generate a valid UUID
  const validUserId: string = typia.random<string & tags.Format<"uuid">>();

  // Test 1: Successful retrieval with valid UUID
  const retrievedProfile: ICommunityPlatformUserProfile =
    await api.functional.communityPlatform.users.profile.at(connection, {
      userId: validUserId,
    });
  typia.assert(retrievedProfile);

  // Validate all required fields are present
  TestValidator.equals("profile ID matches", retrievedProfile.id, validUserId);
  TestValidator.predicate(
    "name is valid string",
    retrievedProfile.name.length >= 2 && retrievedProfile.name.length <= 50,
  );
  TestValidator.predicate(
    "username is valid",
    retrievedProfile.username.length >= 3 &&
      retrievedProfile.username.length <= 20,
  );
  TestValidator.predicate(
    "avatar URL is valid URI",
    /^https?:\/\/.+\.(jpeg|jpg|gif|png|webp)$/.test(
      retrievedProfile.avatar_url,
    ),
  );
  TestValidator.predicate("bio is valid", retrievedProfile.bio.length <= 500);
  TestValidator.predicate(
    "location is valid",
    retrievedProfile.location.length <= 100,
  );
  TestValidator.predicate(
    "joined_at is valid ISO datetime",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedProfile.joined_at,
    ),
  );

  // Test 2: Error case - malformed UUID
  await TestValidator.error(
    "invalid UUID format should return HTTP error",
    async () => {
      await api.functional.communityPlatform.users.profile.at(connection, {
        userId: "invalid-uuid-format", // Not a valid UUID
      });
    },
  );

  // Test 3: Error case - empty string
  await TestValidator.error(
    "empty userId should return HTTP error",
    async () => {
      await api.functional.communityPlatform.users.profile.at(connection, {
        userId: "", // Empty string
      });
    },
  );

  // Test 4: Error case - null value (not applicable as userId is required parameter)
  // The system's type system will prevent passing null to userId as it's strictly typed
  // as string & Format<"uuid">, so we don't test null in parameters.
}
