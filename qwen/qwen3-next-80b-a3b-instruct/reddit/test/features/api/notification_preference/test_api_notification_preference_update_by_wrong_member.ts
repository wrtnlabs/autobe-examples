import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preference_update_by_wrong_member(
  connection: api.IConnection,
) {
  // Step 1: Authenticate as member A and create notification preference
  const memberAEmail: string = typia.random<string & tags.Format<"email">>();
  const memberA: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberAEmail,
        password: "StrongPassword123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(memberA);

  // Step 2: Create notification preference for member A
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

  // Step 3: Authenticate as member B (different user)
  const memberBEmail: string = typia.random<string & tags.Format<"email">>();
  const memberB: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberBEmail,
        password: "AnotherStrongPassword456!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.101",
      } satisfies IMember.ICreate,
    });
  typia.assert(memberB);

  // Step 4: Attempt to update member A's notification preference with member B's auth
  await TestValidator.error(
    "member B cannot update member A's notification preference",
    async () => {
      await api.functional.communityPlatform.member.notification_preferences.putByPreferenceid(
        connection,
        {
          preferenceId: createdPreference.id,
          body: {
            active: false,
          } satisfies ICommunityPlatformNotificationPreference.IUpdate,
        },
      );
    },
  );
}
