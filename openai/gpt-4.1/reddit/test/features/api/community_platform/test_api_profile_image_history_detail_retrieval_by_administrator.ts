import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdministrator";
import type { ICommunityPlatformProfileImageHistory } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformProfileImageHistory";

/**
 * Verify that an authenticated administrator can retrieve user profile image
 * history details.
 *
 * Steps:
 *
 * 1. Register a new administrator and obtain credentials.
 * 2. Using administrator authority, request a specific user profile image history
 *    record by userId and profileImageHistoryId (random values in this test
 *    context).
 * 3. Validate the API returns all major audit details about the profile image
 *    history event, proving access control and data integrity.
 * 4. Ensure the response structure matches the required DTO and all relevant audit
 *    fields are present and correctly typed.
 */
export async function test_api_profile_image_history_detail_retrieval_by_administrator(
  connection: api.IConnection,
) {
  // 1. Register an administrator and receive credentials.
  const adminBody = {
    email: typia.random<string & tags.Format<"email">>(),
    password: typia.random<string & tags.Format<"password">>(),
  } satisfies ICommunityPlatformAdministrator.ICreate;
  const adminAuth: ICommunityPlatformAdministrator.IAuthorized =
    await api.functional.auth.administrator.join(connection, {
      body: adminBody,
    });
  typia.assert(adminAuth);

  // 2. Prepare random UUIDs, simulating existing user/profile image history in the system.
  const userId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();
  const profileImageHistoryId: string & tags.Format<"uuid"> = typia.random<
    string & tags.Format<"uuid">
  >();

  // 3. Retrieve the detailed profile image history record.
  const history: ICommunityPlatformProfileImageHistory =
    await api.functional.communityPlatform.administrator.users.profileImageHistory.at(
      connection,
      {
        userId,
        profileImageHistoryId,
      },
    );
  typia.assert(history);

  // 4. Validate returned fields are present and correctly typed, using TestValidator for business assertions
  TestValidator.predicate(
    "history.id matches requested profileImageHistoryId",
    history.id === profileImageHistoryId,
  );
  TestValidator.predicate(
    "history.community_platform_user_id matches requested userId",
    history.community_platform_user_id === userId,
  );
  TestValidator.predicate(
    "image_uri is non-empty string",
    typeof history.image_uri === "string" && history.image_uri.length > 0,
  );
  TestValidator.predicate(
    "uploaded_at is a valid date-time string",
    typeof history.uploaded_at === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(history.uploaded_at),
  );
  TestValidator.predicate(
    "effective_from is a valid date-time string",
    typeof history.effective_from === "string" &&
      /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(history.effective_from),
  );
  // removed_at and deleted_at are optional/null
}
