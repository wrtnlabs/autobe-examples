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
export async function test_api_notification_event_retrieval_by_member(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create a new connection and authenticate member
  const memberConnection: api.IConnection = { host: connection.host };
  const member = await authorize_member_join(memberConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: typia.random<string & tags.Format<"uri">>(),
      referrer: typia.random<string & tags.Format<"uri">>(),
    },
  });
  typia.assert(member);
  // Step 2: Generate a random notification event (simulating one created by the system)
  const notification = typia.random<ICommunityPlatformNotificationEvent>();
  // Ensure it belongs to the authenticated member and is not archived
  notification.recipient_id = member.id;
  notification.status = "processed"; // Must not be 'archived'
  // Step 3: Call the API to retrieve the notification event by its ID
  const retrieved =
    await api.functional.communityPlatform.member.notification_events.at(
      memberConnection,
      {
        eventId: notification.id,
      },
    );
  typia.assert(retrieved);
  // Step 4: Validate business-level constraints
  TestValidator.equals(
    "recipient_id matches authenticated member",
    retrieved.recipient_id,
    member.id,
  );
  TestValidator.predicate(
    "notification is not archived",
    retrieved.status !== "archived",
  );
}
