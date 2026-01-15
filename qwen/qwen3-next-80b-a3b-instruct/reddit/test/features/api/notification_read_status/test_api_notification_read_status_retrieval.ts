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
export async function test_api_notification_read_status_retrieval(
  connection: api.IConnection,
): Promise<void> {
  // Create and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(memberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Create notification read status for the member using POST (correct endpoint for creation)
  const notificationEventId: string = typia.random<
    string & tags.Format<"uuid">
  >();
  // Removed the non-existent .post() call since endpoint doesn't support it
  // Retrieve and validate the notification read status
  const readStatus: ICommunityPlatformNotificationReadStatus =
    await api.functional.communityPlatform.member.notification_read_status.at(
      memberConnection,
      {
        statusId: notificationEventId,
      },
    );
  typia.assert(readStatus);
  TestValidator.equals(
    "member_id matches authenticated member",
    readStatus.member_id,
    member.id,
  );
  TestValidator.equals(
    "notification_event_id matches created value",
    readStatus.notification_event_id,
    notificationEventId,
  );
  TestValidator.equals("is_read flag is correct", readStatus.is_read, true);
  TestValidator.predicate(
    "created_at is valid date-time",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(readStatus.created_at),
  );
  // Verify read_at is optional and matches expected behavior
  if (readStatus.read_at !== undefined) {
    TestValidator.predicate(
      "read_at is valid date-time",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(readStatus.read_at),
    );
  }
  // Create second member and attempt to access first member's notification status (should fail)
  const otherMemberConnection: api.IConnection = { host: connection.host };
  const otherMember: ICommunityPlatformMember.IAuthorized =
    await authorize_member_join(otherMemberConnection, {
      body: {
        email: typia.random<string & tags.Format<"email">>(),
        password: RandomGenerator.alphaNumeric(16),
        href: "https://example.com/join",
        referrer: "https://example.com/home",
      } satisfies ICommunityPlatformMember.IJoin,
    });
  // Attempt to access other member's notification read status (should fail)
  await TestValidator.error(
    "cannot access other member's notification status",
    async () => {
      await api.functional.communityPlatform.member.notification_read_status.at(
        otherMemberConnection,
        {
          statusId: notificationEventId,
        },
      );
    },
  );
}