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
export async function test_api_notification_read_status_deletion_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Authenticate member via join
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
  // Step 2: Create notification read status by marking as read via PUT endpoint
  // We need to create a notification first, but since there's no API to create notifications,
  // we simulate by calling PUT /communityPlatform/member/notification-read-status/{statusId} with a generated statusId
  // This action will create the record if it doesn't exist
  const statusId: string = typia.random<string & tags.Format<"uuid">>();
  const readStatusUpdate: ICommunityPlatformNotificationReadStatus.IUpdate = {
    status: "read",
  };
  const updatedReadStatus: ICommunityPlatformNotificationReadStatus =
    await api.functional.communityPlatform.member.notification_read_status.putByStatusid(
      memberConnection,
      {
        statusId,
        body: readStatusUpdate,
      },
    );
  typia.assert(updatedReadStatus);
  // Verify the created record has correct properties
  TestValidator.equals("statusId matches", updatedReadStatus.id, statusId);
  TestValidator.equals(
    "notification_event_id exists",
    updatedReadStatus.notification_event_id !== undefined,
    true,
  );
  TestValidator.equals(
    "member_id matches",
    updatedReadStatus.member_id,
    member.id,
  );
  TestValidator.equals("is_read is true", updatedReadStatus.is_read, true);
  TestValidator.equals(
    "read_at exists",
    updatedReadStatus.read_at !== undefined,
    true,
  );
  // Step 3: Delete the notification read status record
  await api.functional.communityPlatform.member.notification_read_status.erase(
    memberConnection,
    {
      statusId,
    },
  );
  // Step 4: Validate deletion by attempting to recreate with the same statusId
  // This should succeed since the record was permanently deleted
  const recreatedReadStatus: ICommunityPlatformNotificationReadStatus =
    await api.functional.communityPlatform.member.notification_read_status.putByStatusid(
      memberConnection,
      {
        statusId,
        body: {
          status: "unread",
        } satisfies ICommunityPlatformNotificationReadStatus.IUpdate,
      },
    );
  typia.assert(recreatedReadStatus);
  // Validate the new record has same ID but different state
  TestValidator.equals(
    "recreated statusId matches",
    recreatedReadStatus.id,
    statusId,
  );
  TestValidator.equals(
    "recreated is_read is false",
    recreatedReadStatus.is_read,
    false,
  );
  TestValidator.equals(
    "recreated read_at is undefined",
    recreatedReadStatus.read_at === undefined,
    true,
  );
}
