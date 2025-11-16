import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";

/**
 * Test that a newly registered user can append a new profile image to their
 * profile image history.
 *
 * 1. Register a new user using the join API. This provides authentication context
 *    and gives a userId.
 * 2. Construct a valid ICommunityPlatformProfileImageHistory.ICreate body with
 *    unique image_uri and current timestamps for uploaded_at/effective_from.
 * 3. Call the profile image history append endpoint as the created user, using
 *    their userId as path param.
 * 4. Validate that the resulting ICommunityPlatformProfileImageHistory record:
 *
 *    - Has an id (uuid)
 *    - Community_platform_user_id matches the created user id
 *    - Image_uri matches the value sent
 *    - Uploaded_at and effective_from are valid ISO8601 timestamps and match sent
 *         values
 *    - Removed_at and deleted_at are absent/null (since just created)
 *    - All types and field values are valid (validated by typia.assert)
 */
export async function test_api_profile_image_history_append_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;
  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, {
      body: joinBody,
    });
  typia.assert(user);

  // 2. Construct valid profile image history append body (image_uri, timestamps)
  const now = new Date();
  const uploadTimestamp = now.toISOString();
  // Use RandomGenerator to create a deterministic but valid image URI
  const imageUri = `https://images.example.com/profile/${user.id}/${RandomGenerator.alphaNumeric(10)}.jpg`;
  const appendBody = {
    image_uri: imageUri as string & tags.Format<"uri">,
    uploaded_at: uploadTimestamp as string & tags.Format<"date-time">,
    effective_from: uploadTimestamp as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformProfileImageHistory.ICreate;

  // 3. Append the profile image history
  const result: ICommunityPlatformProfileImageHistory =
    await api.functional.communityPlatform.user.users.profileImageHistory.create(
      connection,
      {
        userId: user.id,
        body: appendBody,
      },
    );
  typia.assert(result);

  // 4. Validate result record fields
  TestValidator.predicate(
    "result id is valid uuid",
    typeof result.id === "string" && /^[0-9a-f-]{36}$/i.test(result.id),
  );
  TestValidator.equals(
    "linked user id matches",
    result.community_platform_user_id,
    user.id,
  );
  TestValidator.equals(
    "image_uri matches",
    result.image_uri,
    appendBody.image_uri,
  );
  TestValidator.equals(
    "uploaded_at matches",
    result.uploaded_at,
    appendBody.uploaded_at,
  );
  TestValidator.equals(
    "effective_from matches",
    result.effective_from,
    appendBody.effective_from,
  );
  TestValidator.equals(
    "removed_at is null or undefined",
    result.removed_at,
    undefined,
  );
  TestValidator.equals(
    "deleted_at is null or undefined",
    result.deleted_at,
    undefined,
  );
}
