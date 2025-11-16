import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preference_create_unauthenticated(
  connection: api.IConnection,
) {
  // Step 1: Create a new member account via authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const password: string = "SecurePassword123!";

  const joinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: password,
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Use the generated authentication token to make an authenticated request
  // This confirms the system is properly handling authentication
  const notificationType: ICommunityPlatformNotificationPreference.ICreate["type"] =
    RandomGenerator.pick([
      "comment_mention",
      "moderation_action",
      "report_update",
      "system_announcement",
      "community_invite",
      "new_follower",
    ] as const);

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

  // Step 3: Create a new unauthenticated connection (without any authentication token)
  const unauthConnection: api.IConnection = {
    ...connection,
    headers: {},
  };

  // Step 4: Attempt to create a notification preference with unauthenticated connection
  // This should fail with 401 Unauthorized as per requirements
  await TestValidator.httpError(
    "unauthenticated user should receive 401 Unauthorized",
    401,
    async () => {
      await api.functional.communityPlatform.member.notification_preferences.create(
        unauthConnection,
        {
          body: {
            type: notificationType,
          } satisfies ICommunityPlatformNotificationPreference.ICreate,
        },
      );
    },
  );
}
