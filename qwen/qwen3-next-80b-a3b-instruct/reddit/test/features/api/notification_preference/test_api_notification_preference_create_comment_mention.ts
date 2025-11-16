import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preference_create_comment_mention(
  connection: api.IConnection,
) {
  // Step 1: Create new member user context for authentication
  const memberEmail: string = typia.random<string & tags.Format<"email">>();
  const joinResponse: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: memberEmail,
        password: "SecurePass123!",
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(joinResponse);

  // Step 2: Create new notification preference for comment_mention
  const notificationPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.create(
      connection,
      {
        body: {
          type: "comment_mention",
        } satisfies ICommunityPlatformNotificationPreference.ICreate,
      },
    );
  typia.assert(notificationPreference);

  // Step 3: Validate notification preference properties
  TestValidator.equals(
    "notification preference type is comment_mention",
    notificationPreference.type,
    "comment_mention",
  );
  TestValidator.equals(
    "notification preference active status is true",
    notificationPreference.active,
    true,
  );
  TestValidator.equals(
    "notification preference user_id matches authenticated user",
    notificationPreference.user_id,
    joinResponse.id,
  );
  TestValidator.predicate(
    "notification preference has valid UUID id",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      notificationPreference.id,
    ),
  );
  TestValidator.predicate(
    "notification preference has valid date-time created_at",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      notificationPreference.created_at,
    ),
  );
  TestValidator.equals(
    "notification preference updated_at is undefined",
    notificationPreference.updated_at,
    undefined,
  );
}
