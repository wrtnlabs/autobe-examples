import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preference_update_with_invalid_id(
  connection: api.IConnection,
) {
  const member = await api.functional.auth.member.join(connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "SecurePass123!",
      href: "https://community-platform.com/join",
      referrer: "https://community-platform.com",
      ip: "192.168.1.100",
    } satisfies IMember.ICreate,
  });
  typia.assert(member);
  const nonExistentId = "00000000-0000-0000-0000-000000000000";
  await TestValidator.error(
    "non-existent preferenceId should return 404",
    async () => {
      await api.functional.communityPlatform.member.notification_preferences.putByPreferenceid(
        connection,
        {
          preferenceId: nonExistentId,
          body: {
            active: false,
          } satisfies ICommunityPlatformNotificationPreference.IUpdate,
        },
      );
    },
  );
}
