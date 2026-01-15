import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEvent";
import type { ICommunityPlatformMember } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformMember";
import type { ICommunityPlatformNotificationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationEvent";
import { authorize_member_join } from "../../../authorize/authorize_member_join";
import { authorize_member_login } from "../../../authorize/authorize_member_login";
import { authorize_member_refresh } from "../../../authorize/authorize_member_refresh";
export async function test_api_notification_acknowledgment_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create first member
  const member1Connection: api.IConnection = { host: connection.host };
  const member1 = await authorize_member_join(member1Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member1);
  // Step 2: Create second member
  const member2Connection: api.IConnection = { host: connection.host };
  const member2 = await authorize_member_join(member2Connection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://example.com/join",
      referrer: "https://example.com/home",
    } satisfies ICommunityPlatformMember.IJoin,
  });
  typia.assert(member2);
  // Step 3: Generate a notification for member1
  const member1Notification =
    typia.random<ICommunityPlatformNotificationEvent>();
  member1Notification.recipient_id = member1.id;
  member1Notification.status = "pending";
  member1Notification.created_at = new Date().toISOString();
  member1Notification.is_read = false;
  // Step 4: Update the notification owned by member1 using member1's connection (expected success)
  const updateResult1 =
    await api.functional.communityPlatform.member.notification_events.update(
      member1Connection,
      {
        eventId: member1Notification.id,
        body: {
          status: "processed",
          comment: "Member acknowledged their notification",
        } satisfies ICommunityPlatformNotificationEvent.IUpdate,
      },
    );
  typia.assert(updateResult1);
  // Step 5: Validate the update was successful for the owner
  // Note: comment property does not exist in response type ICommunityPlatformNotificationEvent
  // We validate the status change which is the main purpose of the update
  TestValidator.equals(
    "notification status updated for owner",
    updateResult1.status,
    "processed",
  );
  TestValidator.equals(
    "notification recipient matches member1",
    updateResult1.recipient_id,
    member1.id,
  );
  // Step 6: Generate a notification for member2
  const member2Notification =
    typia.random<ICommunityPlatformNotificationEvent>();
  member2Notification.recipient_id = member2.id;
  member2Notification.status = "pending";
  member2Notification.created_at = new Date().toISOString();
  member2Notification.is_read = false;
  // Step 7: Try to update the notification owned by member2 using member1's connection (expected error)
  await TestValidator.error(
    "non-owner should not be able to acknowledge notification",
    async () => {
      await api.functional.communityPlatform.member.notification_events.update(
        member1Connection, // member1 trying to update member2's notification
        {
          eventId: member2Notification.id,
          body: {
            status: "processed",
          } satisfies ICommunityPlatformNotificationEvent.IUpdate,
        },
      );
    },
  );
  // Step 8: Validate that timestamp is updated for successful update
  TestValidator.predicate(
    "notification timestamp is updated for owner",
    updateResult1.created_at !== member1Notification.created_at,
  );
}
