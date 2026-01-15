import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformEvent";
import type { ICommunityPlatformNotificationEvent } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformNotificationEvent";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_notification_event_retrieval_by_admin(
  connection: api.IConnection,
): Promise<void> {
  // Step 1: Create admin connection and authenticate
  const adminConnection: api.IConnection = { host: connection.host };
  const adminAuth = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      href: "https://example.com/admin/join",
      referrer: "https://example.com",
    } satisfies ICommunityPlatformAdmin.IJoin,
  });
  // adminConnection.headers is already updated by authorize_admin_join
  // Step 2: Generate a valid UUID for an existing notification event (assume it exists)
  const eventId = typia.random<string & tags.Format<"uuid">>();
  // Step 3: Retrieve the notification event by eventId
  const retrievedEvent =
    await api.functional.communityPlatform.admin.notification_events.at(
      adminConnection,
      {
        eventId,
      },
    );
  typia.assert(retrievedEvent);
  // Step 4: Validate the structure with exact field validation
  TestValidator.equals("event id matches", retrievedEvent.id, eventId);
  TestValidator.predicate(
    "event type is a string",
    typeof retrievedEvent.type === "string",
  );
  TestValidator.predicate(
    "event created_at is datetime format",
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/.test(
      retrievedEvent.created_at,
    ),
  );
  TestValidator.predicate(
    "event status is valid",
    ["pending", "processed", "archived"].includes(retrievedEvent.status),
  );
  TestValidator.predicate(
    "event source is a string",
    typeof retrievedEvent.source === "string",
  );
  TestValidator.predicate(
    "event priority is between 1 and 5",
    retrievedEvent.priority >= 1 && retrievedEvent.priority <= 5,
  );
  TestValidator.predicate(
    "event delivery_method is valid",
    ["email", "push", "in_app"].includes(retrievedEvent.delivery_method),
  );
  TestValidator.predicate(
    "event subject length <= 255",
    retrievedEvent.subject.length <= 255,
  );
  TestValidator.predicate(
    "event body is a string",
    typeof retrievedEvent.body === "string",
  );
  // Fix: Use TestValidator.predicate for boolean type validation instead of equals
  TestValidator.predicate(
    "event is_read is boolean",
    typeof retrievedEvent.is_read === "boolean",
  );
  TestValidator.predicate(
    "event recipient_id is uuid",
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(
      retrievedEvent.recipient_id,
    ),
  );
  TestValidator.predicate(
    "event category is a string",
    typeof retrievedEvent.category === "string",
  );
  // Validate event_data if present
  if (retrievedEvent.event_data !== undefined) {
    // Fix: Use TestValidator.predicate for type validation, not equals
    TestValidator.predicate(
      "event_data is a string",
      typeof retrievedEvent.event_data === "string",
    );
  }
}
