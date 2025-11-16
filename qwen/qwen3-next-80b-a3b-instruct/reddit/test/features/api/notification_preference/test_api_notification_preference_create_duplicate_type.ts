import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preference_create_duplicate_type(
  connection: api.IConnection,
) {
  // 1. Create new member user context for authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assertGuard(member!);

  // 2. Create initial notification preference
  const notificationType: ICommunityPlatformNotificationPreference.ICreate["type"] =
    "comment_mention";
  const firstPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.create(
      connection,
      {
        body: {
          type: notificationType,
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(firstPreference);
  TestValidator.equals(
    "first preference type matches",
    firstPreference.type,
    notificationType,
  );

  // 3. Attempt to create duplicate notification preference - should fail with 409 Conflict
  await TestValidator.error(
    "duplicate notification preference type should fail with 409 Conflict",
    async () => {
      await api.functional.communityPlatform.member.notification_preferences.create(
        connection,
        {
          body: {
            type: notificationType,
          } satisfies ICommunityPlatformNotificationPreference.ICreate,
        },
      );
    },
  );
}
