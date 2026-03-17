import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";

export async function test_api_admin_notification_broadcast_to_multiple_actors(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin setup - join platform
  const adminConnection: api.IConnection = { host: connection.host };
  const adminJoin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "1234",
      href: "https://admin.example.com/join",
      referrer: "https://admin.example.com/register",
    },
  });
  typia.assert(adminJoin);
  // Create new connection with admin token for API calls
  const adminApiConnection: api.IConnection = { host: connection.host };
  adminApiConnection.headers = {
    Authorization: adminJoin.token.access,
  };
  // 2. Create recipient IDs using typia.random with validation
  const customerId: string = typia.random<string & tags.Format<"uuid">>();
  typia.assert(customerId);
  const sellerId: string = typia.random<string & tags.Format<"uuid">>();
  typia.assert(sellerId);
  const superAdminId: string = typia.random<string & tags.Format<"uuid">>();
  typia.assert(superAdminId);
  // 3. Create notification with multiple recipients
  const body = {
    title: "System Maintenance Scheduled",
    body: "Platform maintenance will be performed on 2026-03-20 from 02:00 to 04:00 UTC. During this time, all services may be temporarily unavailable. We apologize for any inconvenience.",
    type: "platform_announcement" as const,
    recipients: [
      {
        recipient_type: "customer" as const,
        recipient_id: customerId,
      },
      {
        recipient_type: "seller" as const,
        recipient_id: sellerId,
      },
      {
        recipient_type: "superAdmin" as const,
        recipient_id: superAdminId,
      },
    ] satisfies IEcommerceMallNotification.IDeliver["recipients"],
  } satisfies IEcommerceMallNotification.IDeliver;
  const response =
    await api.functional.ecommerceMall.admin.notifications.deliver(
      adminApiConnection,
      { body },
    );
  typia.assert(response);
  // 4. Validate notification details
  TestValidator.equals("notification title", response.title, body.title);
  TestValidator.equals("notification body", response.body, body.body);
  TestValidator.equals("notification type", response.type, body.type);
  TestValidator.equals("notification status", response.status, "unread");
  typia.assert(response.id); // Validate UUID format
  // Validate timestamps are valid date-time format
  const createdAt = new Date(response.created_at);
  const updatedAt = new Date(response.updated_at);
  TestValidator.predicate("created_at is valid", createdAt.getTime() > 0);
  TestValidator.predicate("updated_at is valid", updatedAt.getTime() > 0);
  // Validate soft deletion timestamp (should be null for active notification)
  TestValidator.equals(
    "notification not soft-deleted",
    response.deleted_at,
    null,
  );
}
