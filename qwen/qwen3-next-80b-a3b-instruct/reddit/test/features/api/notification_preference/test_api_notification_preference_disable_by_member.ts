import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preference_disable_by_member(
  connection: api.IConnection,
) {
  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: "validPassword123456789", // Must be at least 12 characters
        href: "https://community-platform.com/join",
        referrer: "https://community-platform.com",
        ip: "192.168.1.100",
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

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

  const updatedPreference: ICommunityPlatformNotificationPreference =
    await api.functional.communityPlatform.member.notification_preferences.putByPreferenceid(
      connection,
      {
        preferenceId: notificationPreference.id,
        body: {
          active: false,
        } satisfies ICommunityPlatformNotificationPreference.IUpdate,
      },
    );
  typia.assert(updatedPreference);

  TestValidator.equals(
    "preference should be disabled",
    updatedPreference.active,
    false,
  );
  TestValidator.predicate(
    "updated_at should exist and be different from created_at",
    () =>
      updatedPreference.updated_at !== undefined &&
      updatedPreference.updated_at !== notificationPreference.created_at,
  );
}
