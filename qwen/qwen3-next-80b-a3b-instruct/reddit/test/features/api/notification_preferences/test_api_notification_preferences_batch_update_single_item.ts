import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import typia, { tags } from "typia";

import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationPreference";
import type { IMember } from "@ORGANIZATION/PROJECT-api/lib/structures/IMember";

export async function test_api_notification_preferences_batch_update_single_item(
  connection: api.IConnection,
) {
  // Step 1: Create a new member user for authentication
  const email: string = typia.random<string & tags.Format<"email">>();
  const password: string = "StrongPass123!";
  const href: string = "https://community-platform.com/join";
  const referrer: string = "https://community-platform.com";
  const ip: string = "192.168.1.1";

  const member: ICommunityPlatformMember.IAuthorized =
    await api.functional.auth.member.join(connection, {
      body: {
        email,
        password,
        href,
        referrer,
        ip,
      } satisfies IMember.ICreate,
    });
  typia.assert(member);

  // Step 2: Prepare single notification preference update
  const preferenceUpdate: ICommunityPlatformNotificationPreference.IUpdate = {
    active: false,
  };

  // Step 3: Execute batch update for single preference
  await api.functional.communityPlatform.member.notification_preferences.patch(
    connection,
    {
      body: preferenceUpdate,
    },
  );

  // Step 4: Validate that update was successful
  // Note: The response is void with 204 No Content, so no typia.assert needed
  // We trust the API contract that 204 status indicates success
  // The test validates execution completion without error
}
