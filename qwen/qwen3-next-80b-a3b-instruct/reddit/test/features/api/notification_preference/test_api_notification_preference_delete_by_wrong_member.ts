import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preference_delete_by_wrong_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as first member (User A) to create a notification preference
  const userAEmail: string = typia.random<string & tags.Format<"email">>();
  const userA: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: userAEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(userA);

  // Step 2: Create a notification preference for User A
  const preferenceType: ICommunityPlatformNotificationPreference.ICreate["type"] =
    "comment_mention";
  const createdPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.create(
      connection,
      {
        body: {
          type: preferenceType,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(createdPreference);
  const preferenceId: string = createdPreference.id;

  // Step 3: Authenticate as second member (User B) who should not be able to delete User A's preference
  const userBEmail: string = typia.random<string & tags.Format<"email">>();
  const userB: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: userBEmail,
        password: "SecurePass456!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.101",
      } satisfies IMember.ICreate,
    });
  typia.assert(userB);

  // Step 4: Attempt to delete User A's notification preference using User B's authentication
  // This should fail with a 404 or 403 error, as users cannot delete preferences owned by others
  await TestValidator.error(
    "User B should not be able to delete User A's notification preference",
    async () => {
      await api.functional.communityPlatform.member.notification_preferences.erase(
        connection,
        {
          preferenceId: preferenceId,
        },
      );
    },
  );
}
