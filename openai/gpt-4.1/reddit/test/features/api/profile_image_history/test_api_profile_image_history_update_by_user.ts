import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test that a platform user can update metadata for their profile image history
 * record.
 *
 * This test covers the full lifecycle of a user updating their own profile
 * image history on the platform. The following steps occur in the workflow:
 *
 * 1. Register a new user using unique email/password credentials. Assert a
 *    successful onboarding and token issuance.
 * 2. Create a profile image history entry for that user, simulating a user
 *    uploading a profile image. Assert correct linking to the user and data
 *    shape.
 * 3. Update the profile image history entry to set the 'removed_at' timestamp,
 *    emulating an image replacement/removal event with a valid new date. Assert
 *    that the record is correctly updated and the audit/compliance logic is
 *    enforced.
 * 4. Validate that only the authenticated user (owner) is able to perform this
 *    update action (negative test: skip as only user context available).
 * 5. Assert all returned DTOs match the schema and changes are reflected as
 *    expected.
 */
export async function test_api_profile_image_history_update_by_user(
  connection: api.IConnection,
) {
  // 1. Register a user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: RandomGenerator.alphaNumeric(10),
  } satisfies ICommunityPlatformUser.IJoin;
  const user = await api.functional.auth.user.join(connection, {
    body: joinBody,
  });
  typia.assert(user);

  // 2. Create profile image history for this user
  const createBody = {
    image_uri: typia.random<string & tags.Format<"uri">>(),
    uploaded_at: new Date().toISOString(),
    effective_from: new Date().toISOString(),
  } satisfies ICommunityPlatformProfileImageHistory.ICreate;
  const imageHistory =
    await api.functional.communityPlatform.user.users.profileImageHistory.create(
      connection,
      {
        userId: user.id,
        body: createBody,
      },
    );
  typia.assert(imageHistory);
  TestValidator.equals(
    "Created image history should be linked to correct user",
    imageHistory.community_platform_user_id,
    user.id,
  );
  TestValidator.equals(
    "Created image uri should match input",
    imageHistory.image_uri,
    createBody.image_uri,
  );

  // 3. Update the history record - set removed_at timestamp to 'retire' image
  const updateBody = {
    effective_from: imageHistory.effective_from,
    removed_at: new Date(Date.now() + 10 * 60 * 1000).toISOString(), // 10 min later
  } satisfies ICommunityPlatformProfileImageHistory.IUpdate;
  const patched =
    await api.functional.communityPlatform.user.users.profileImageHistory.update(
      connection,
      {
        userId: user.id,
        profileImageHistoryId: imageHistory.id,
        body: updateBody,
      },
    );
  typia.assert(patched);

  // 4. Validation
  TestValidator.equals(
    "Updated record id should match original",
    patched.id,
    imageHistory.id,
  );
  TestValidator.equals(
    "Updated removed_at should match update",
    patched.removed_at,
    updateBody.removed_at,
  );
  TestValidator.equals(
    "effective_from remains unchanged",
    patched.effective_from,
    imageHistory.effective_from,
  );
  TestValidator.equals(
    "community_platform_user_id remains correct",
    patched.community_platform_user_id,
    user.id,
  );
}
