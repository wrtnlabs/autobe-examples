import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
export async function test_api_admin_notification_delivery_to_customer(connection: api.IConnection): Promise<void> {
    // Step 1: Admin registration
    const adminConnection: api.IConnection = { host: connection.host };
    const adminAuthorized = await authorize_admin_join(adminConnection, {
        body: {
            email: typia.random<string & tags.Format<"email">>(),
            password: RandomGenerator.alphaNumeric(16),
            href: typia.random<string & tags.Format<"uri">>(),
            referrer: typia.random<string & tags.Format<"uri">>(),
        },
    });
    typia.assert(adminAuthorized);
    // Step 2: Customer setup - generate a valid UUID-like identifier for customer recipient
    // Since there's no customer join utility available, we use a UUID-like pattern
    const customerUuid = typia.random<string & tags.Format<"uuid">>() as string & tags.Format<"uuid">;
    // Step 3: Deliver notification to customer
    const notification: IEcommerceMallNotification = await api.functional.ecommerceMall.admin.notifications.deliver(adminConnection, {
        body: {
            title: "Your seller account has been approved",
            body: `Congratulations! Your seller application has been approved. Your seller account is now active and you can start listing products. Seller ID: ${customerUuid}`,
            type: "seller_approval",
            recipients: [
                {
                    recipient_type: "customer",
                    recipient_id: customerUuid,
                },
            ],
        },
    });
    typia.assert(notification);
    // Step 4: Validate notification structure
    TestValidator.equals("notification title", notification.title, "Your seller account has been approved");
    TestValidator.equals("notification type", notification.type, "seller_approval");
    TestValidator.equals("notification status", notification.status, "unread");
    TestValidator.notEquals("notification has valid id", notification.id, null);
    TestValidator.predicate("title is non-empty", notification.title.length > 0);
    TestValidator.predicate("body is non-empty", notification.body.length > 0);
    // Step 5: Validate timestamps
    TestValidator.predicate("created_at is valid date-time", /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.[\d+Z]/.test(notification.created_at));
    TestValidator.predicate("updated_at is valid date-time", /\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.[\d+Z]/.test(notification.updated_at));
    TestValidator.equals("deleted_at is null for active notification", notification.deleted_at, null);
}