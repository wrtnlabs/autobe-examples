import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationReadStatus } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationReadStatus";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_read_status_toggle(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const memberAuth = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(memberAuth);
  // Step 2: Generate notification event ID (to be used for toggle)
  const notificationEventId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Prepare request object with all fields (IRequest) - simulate client data
  const firstToggleRequest: ICommunityPlatformNotificationReadStatus.IRequest =
    {
      id: typia.random<string & tags.Format<"uuid">>(),
      notification_event_id: notificationEventId,
      member_id: memberAuth.id,
      is_read: true,
      read_at: new Date().toISOString(), // Fixed: Use valid ISO string instead of null
      created_at: new Date().toISOString(),
    };
  // Step 4: Toggle read status from false (implicit) to true
  const toggleToRead =
    await api.functional.communityPlatform.member.notification_read_status.patch(
      memberConnection,
      {
        body: firstToggleRequest,
      },
    );
  typia.assert(toggleToRead);
  // Step 5: Validate that is_read is now true and read_at is set by system
  TestValidator.equals("is_read toggled to true", toggleToRead.is_read, true);
  TestValidator.predicate(
    "read_at timestamp is set by system",
    toggleToRead.read_at !== undefined,
  );
  const readAtTimestamp = toggleToRead.read_at!;
  typia.assert<string & tags.Format<"date-time">>(readAtTimestamp);
  // Step 6: Prepare second toggle request using the response data to maintain consistency
  const secondToggleRequest: ICommunityPlatformNotificationReadStatus.IRequest =
    {
      id: toggleToRead.id,
      notification_event_id: toggleToRead.notification_event_id,
      member_id: toggleToRead.member_id,
      is_read: false,
      read_at: readAtTimestamp, // Preserve the timestamp from first toggle - do not set to undefined
      created_at: toggleToRead.created_at,
    };
  // Step 7: Toggle read status back to false
  const toggleToUnread =
    await api.functional.communityPlatform.member.notification_read_status.patch(
      memberConnection,
      {
        body: secondToggleRequest,
      },
    );
  typia.assert(toggleToUnread);
  // Step 8: Validate that is_read is now false and read_at timestamp remains unchanged
  TestValidator.equals(
    "is_read toggled to false",
    toggleToUnread.is_read,
    false,
  );
  TestValidator.equals(
    "read_at timestamp preserved after toggling back",
    toggleToUnread.read_at,
    readAtTimestamp,
  );
}