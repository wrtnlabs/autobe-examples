import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageICommunityPlatformProfileImageHistory";

/**
 * Validate full retrieval of a user's own profile image change history.
 *
 * This test covers the normal workflow for a user to access their own audit
 * trail of profile image changes. The business context is that users may wish
 * to audit, review, or restore previous profile images, requiring the platform
 * to provide a history endpoint that returns all former and current profile
 * images with metadata.
 *
 * Test Steps:
 *
 * 1. Register a new user with unique email and secure password using the
 *    onboarding API.
 * 2. After registration, authenticate as this new user (the SDK auto-injects
 *    credentials for subsequent requests).
 * 3. Invoke the profile image history full retrieval endpoint using the new user's
 *    UUID as the path parameter, and provide a basic paginated request for the
 *    first page (with a practical low limit for API result clarity).
 * 4. Validate response structure: should be a paginated object with profile image
 *    history records. As a new user, the history is generally empty or may
 *    contain a single initial image record if a default profile image is set by
 *    system policy.
 * 5. Verify each returned record's metadata fields (image URI, timestamps,
 *    audit/deletion markers) for correctness and that all records reference the
 *    current user only.
 * 6. Confirm that no history data for other users is present and that pagination
 *    metadata is reasonable for the expected result set size.
 *
 * This test ensures correct data exposure, privacy boundaries, and auditability
 * for user profile image history APIs.
 */
export async function test_api_profile_image_history_full_retrieval_by_user(
  connection: api.IConnection,
) {
  // 1. Register a new user
  const joinBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformUser.IJoin;

  const user: ICommunityPlatformUser.IAuthorized =
    await api.functional.auth.user.join(connection, { body: joinBody });
  typia.assert(user);

  // 2. (Authentication state is handled automatically by the SDK)
  // Prepare paginated request for the profile image history endpoint
  const reqBody = {
    user_id: user.id,
    page: 1,
    limit: 3,
    sort_by: "uploaded_at",
    sort_direction: "desc",
  } satisfies ICommunityPlatformProfileImageHistory.IRequest;

  // 3. Invoke the profile image history endpoint for the authenticated user
  const result =
    await api.functional.communityPlatform.user.users.profileImageHistory.index(
      connection,
      {
        userId: user.id,
        body: reqBody,
      },
    );
  typia.assert(result);

  // 4. Validate basic pagination info
  TestValidator.equals(
    "pagination.page should be 1",
    result.pagination.current,
    1,
  );
  TestValidator.equals(
    "pagination.limit should match request",
    result.pagination.limit,
    3,
  );

  // 5. Confirm that all records returned (if any) belong to the new user
  for (const entry of result.data) {
    typia.assert(entry);
    TestValidator.equals(
      "profile image record must belong to requesting user",
      entry.user.id,
      user.id,
    );
  }

  // 6. (New user) image history should be empty or a single default image only
  TestValidator.predicate(
    "result.data should have 0 or 1 initial image records",
    result.data.length === 0 || result.data.length === 1,
  );
}
