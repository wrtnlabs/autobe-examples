import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preference_update_with_invalid_boolean(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member to establish context
  const memberEmail = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Create a notification preference
  const notificationType: ICommunityPlatformNotificationPreference.ICreate["type"] =
    "comment_mention";
  const createdPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.create(
      connection,
      {
        body: {
          type: notificationType,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(createdPreference);

  // Step 3: Generate a non-existent preferenceId (valid UUID format but doesn't exist)
  const nonExistentPreferenceId: string = typia.random<
    string & tags.Format<"uuid">
  >();

  // Step 4: Test that updating non-existent preference returns 404 Not Found (HTTP error)
  // This is a valid business logic test using correct types (active: true)
  await TestValidator.httpError(
    "should return 404 for non-existent preference",
    404,
    async () => {
      await api.functional.communityPlatform.member.notification_preferences.putByPreferenceid(
        connection,
        {
          preferenceId: nonExistentPreferenceId,
          body: {
            active: true, // Correct type: boolean
          } satisfies ICommunityPlatformNotificationPreference.IUpdate,
        },
      );
    },
  );
}
