import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEconPoliticalDiscussionRegisteredMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionRegisteredMember";
import type { IEconPoliticalDiscussionUser } from "@ORGANIZATION/PROJECT-api/lib/structures/IEconPoliticalDiscussionUser";

export async function test_api_user_profile_retrieval_success(
  connection: api.IConnection,
) {
  // Step 1: Create a registered member account
  const userEmail: string = typia.random<string & tags.Format<"email">>();
  const userDisplayName: string = RandomGenerator.name();
  const userBio: string = RandomGenerator.paragraph({
    sentences: 3,
    wordMin: 5,
    wordMax: 10,
  });
  const avatarUrl: string = `https://example.com/avatars/${typia.random<string & tags.Format<"uuid">>()}.png`;

  const createdUser: IEconPoliticalDiscussionRegisteredMember.IAuthorized =
    await api.functional.auth.registeredMember.join(connection, {
      body: {
        display_name: userDisplayName,
        email: userEmail,
        bio: userBio,
        avatar_url: avatarUrl,
        status: "active",
      } satisfies IEconPoliticalDiscussionRegisteredMember.ICreate,
    });
  typia.assert(createdUser);

  // Step 2: Retrieve the user profile using the created user's ID
  const retrievedProfile: IEconPoliticalDiscussionUser =
    await api.functional.econPoliticalDiscussion.users.at(connection, {
      userId: createdUser.id,
    });
  typia.assert(retrievedProfile);

  // Step 3: Validate that the retrieved profile contains all expected fields
  TestValidator.equals(
    "user ID should match",
    retrievedProfile.id,
    createdUser.id,
  );
  TestValidator.equals(
    "display name should match",
    retrievedProfile.display_name,
    userDisplayName,
  );
  TestValidator.equals("email should match", retrievedProfile.email, userEmail);
  TestValidator.equals("bio should match", retrievedProfile.bio, userBio);
  TestValidator.equals(
    "avatar URL should match",
    retrievedProfile.avatar_url,
    avatarUrl,
  );
  TestValidator.equals(
    "status should be active",
    retrievedProfile.status,
    "active",
  );

  // Step 4: Validate temporal tracking fields
  TestValidator.predicate(
    "created_at should be a valid date-time",
    typeof retrievedProfile.created_at === "string" &&
      retrievedProfile.created_at.length > 0,
  );
  TestValidator.predicate(
    "updated_at should be a valid date-time",
    typeof retrievedProfile.updated_at === "string" &&
      retrievedProfile.updated_at.length > 0,
  );
  TestValidator.predicate(
    "deleted_at should be undefined for active user",
    retrievedProfile.deleted_at === null ||
      retrievedProfile.deleted_at === undefined,
  );

  // Step 5: Verify data integrity - the profile should reflect the creation data
  TestValidator.predicate(
    "profile should match creation data",
    retrievedProfile.display_name === userDisplayName &&
      retrievedProfile.email === userEmail &&
      retrievedProfile.bio === userBio &&
      retrievedProfile.avatar_url === avatarUrl,
  );

  // Step 6: Additional validation - ensure UUID format for ID
  TestValidator.predicate(
    "user ID should be valid UUID format",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
      retrievedProfile.id,
    ),
  );

  // Step 7: Verify email format is maintained
  TestValidator.predicate(
    "retrieved email should maintain proper format",
    /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(
      retrievedProfile.email,
    ),
  );
}
