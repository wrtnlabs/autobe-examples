import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";

/**
 * Validate that an authenticated administrator can successfully append a new
 * profile image to a user's profile image history.
 *
 * Steps:
 *
 * 1. Register and authenticate a new administrator. This establishes the privilege
 *    context.
 * 2. Use arbitrary (randomized) userId to simulate the administrative action, as
 *    no user creation API is exposed in scope.
 * 3. As administrator, append a new profile image to the image history using the
 *    administrative endpoint.
 * 4. Validate that the returned audit record includes correct URI,
 *    upload/effective timestamps, references the intended user, and all
 *    necessary fields are present with proper types/formats.
 * 5. Confirm audit-trail/compliance: that the log preserves both upload and
 *    activation event timestamps, and the image URI is exactly as specified.
 */
export async function test_api_profile_image_history_create_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register and authenticate a new administrator
  const adminJoinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const admin: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminJoinBody,
    });
  typia.assert(admin);
  const adminId = admin.id;

  // 2. Simulate a target user by generating a random UUID (as user creation is out of test scope)
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Prepare the profile image history creation data.
  const now = new Date().toISOString();
  const imageHistoryBody = {
    image_uri: ("https://cdn.example.com/profile/" +
      RandomGenerator.alphaNumeric(16) +
      ".jpg") satisfies string & tags.Format<"uri">,
    uploaded_at: now as string & tags.Format<"date-time">,
    effective_from: now as string & tags.Format<"date-time">,
  } satisfies ICommunityPlatformProfileImageHistory.ICreate;

  // 4. As administrator, call the endpoint to append a profile image to user's history
  const result: ICommunityPlatformProfileImageHistory =
    await api.functional.communityPlatform.administrator.users.profileImageHistory.create(
      connection,
      {
        userId,
        body: imageHistoryBody,
      },
    );
  typia.assert(result);

  // 5. Validate returned audit record and field population
  TestValidator.equals(
    "profile image record userId",
    result.community_platform_user_id,
    userId,
  );
  TestValidator.equals(
    "profile image URI matches input",
    result.image_uri,
    imageHistoryBody.image_uri,
  );
  TestValidator.equals(
    "uploaded_at matches input",
    result.uploaded_at,
    imageHistoryBody.uploaded_at,
  );
  TestValidator.equals(
    "effective_from matches input",
    result.effective_from,
    imageHistoryBody.effective_from,
  );
  TestValidator.predicate(
    "result.id is a valid uuid",
    typia.is<string & tags.Format<"uuid">>(result.id),
  );
  TestValidator.predicate(
    "result.uploaded_at is iso datetime",
    typia.is<string & tags.Format<"date-time">>(result.uploaded_at),
  );
  TestValidator.predicate(
    "result.image_uri is a valid uri",
    typia.is<string & tags.Format<"uri">>(result.image_uri),
  );
}
