import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformUserNotificationPreference } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUserNotificationPreference";
import { prepare_random_community_platform_user_notification_preference } from "../../../prepare/prepare_random_community_platform_user_notification_preference";
import { generate_random_community_platform_member_notification_preferences_create } from "../../../generate/generate_random_community_platform_member_notification_preferences_create";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_preference_deletion_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create member connection and authenticate via join
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: typia.random<string & tags.Format<"uri">>(),
        referrer: typia.random<string & tags.Format<"uri">>(),
      } satisfies ICommunityPlatformMember.IJoin,
    });
  typia.assert(member);
  // Step 2: Create notification preference using member's authenticated connection
  const notificationPreference = typia.assert<ICommunityPlatformUserNotificationPreference & { id: string & tags.Format<"uuid"> }>(
    await generate_random_community_platform_member_notification_preferences_create(
      memberConnection,
      {
        body: {
          email: true,
          push: true,
          in_app: true,
          sms: false,
          notification_type: "all",
          preference_state: "enabled",
        } satisfies ICommunityPlatformUserNotificationPreference.ICreate,
      },
    )
  );
  
  // Step 3: Delete the notification preference using preferenceId
  await api.functional.communityPlatform.member.notification_preferences.erase(
    memberConnection,
    {
      preferenceId: notificationPreference.id,
    },
  );
  // Step 4: Verify deletion by attempting to delete again (idempotent behavior)
  // This should succeed with 204 No Content even though the resource is gone
  await api.functional.communityPlatform.member.notification_preferences.erase(
    memberConnection,
    {
      preferenceId: notificationPreference.id,
    },
  );
}