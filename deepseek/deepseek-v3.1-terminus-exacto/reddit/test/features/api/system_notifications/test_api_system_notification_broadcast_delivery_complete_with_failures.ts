import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";
import api from "@ORGANIZATION/PROJECT-api";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { ICommunityPlatformAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformAdmin";
import type { ICommunityPlatformComment } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformComment";
import type { ICommunityPlatformCommunity } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformCommunity";
import type { ICommunityPlatformPost } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformPost";
import type { ICommunityPlatformSystemNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotification";
import type { ICommunityPlatformSystemNotificationBroadcastDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformSystemNotificationBroadcastDelivery";
import type { ICommunityPlatformUser } from "@ORGANIZATION/PROJECT-api/lib/structures/ICommunityPlatformUser";
import { prepare_random_community_platform_system_notification } from "../../../prepare/prepare_random_community_platform_system_notification";
import { generate_random_community_platform_admin_system_notifications_create } from "../../../generate/generate_random_community_platform_admin_system_notifications_create";
import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
/**
 * Test completing a broadcast delivery with partial failures. Update a delivery record
 * to mark it as completed with both successful deliveries and failed deliveries.
 * Verify that the error message field can be set for failed deliveries and that the
 * completed_at timestamp is recorded. Ensure that the delivered_count and failed_count
 * do not exceed the total_recipients value and that the system properly handles
 * delivery completion scenarios.
 */
export async function test_api_system_notification_broadcast_delivery_complete_with_failures(connection: api.IConnection): Promise<void> {
    // 1. Authenticate as admin
    const adminConnection: api.IConnection = { host: connection.host };
    const admin = await authorize_admin_join(adminConnection, { body: {} });
    typia.assert(admin);
    adminConnection.headers = { Authorization: admin.token.access };
    // 2. Create a broadcast system notification
    const notification = await generate_random_community_platform_admin_system_notifications_create(adminConnection, {
        body: {
            notification_type: "platform_announcements",
            title: RandomGenerator.paragraph({ sentences: 2 }),
            message: RandomGenerator.content({ paragraphs: 1 }),
            priority: "normal",
            status: "pending",
            is_broadcast: true,
        },
    });
    typia.assert(notification);
    // 3. Prepare delivery update data with partial failures
    const deliveryId: string & tags.Format<"uuid"> = typia.random<string & tags.Format<"uuid">>();
    const totalRecipients = typia.random<number & tags.Type<"int32"> & tags.Minimum<100>>();
    const deliveredCount = randint(0, totalRecipients - 1);
    const failedCount = randint(1, totalRecipients - deliveredCount);
    const errorMessage = `Delivery failed for ${failedCount} recipients due to network timeout`;
    const completedAt = new Date().toISOString();
    // 4. Update delivery status to completed with failures
    const updated = await api.functional.communityPlatform.admin.system_notifications.broadcast_deliveries.putBySystemnotificationidAndDeliveryid(adminConnection, {
        systemNotificationId: notification.id,
        deliveryId,
        body: {
            delivery_status: "completed",
            delivered_count: deliveredCount satisfies number & tags.Type<"int32"> & tags.Minimum<0> as number,
            failed_count: failedCount satisfies number & tags.Type<"int32"> & tags.Minimum<0> as number,
            completed_at: completedAt satisfies string & tags.Format<"date-time"> as string & tags.Format<"date-time">,
            error_message: errorMessage satisfies string as string,
        } satisfies ICommunityPlatformSystemNotificationBroadcastDelivery.IUpdate,
    });
    typia.assert(updated);
    // 5. Validate response
    TestValidator.equals("delivery status should be completed", updated.delivery_status, "completed");
    TestValidator.predicate("delivered count should be less than total recipients", updated.delivered_count < totalRecipients);
    TestValidator.predicate("failed count should be greater than 0", updated.failed_count > 0);
    TestValidator.equals("error message should be set", updated.error_message, errorMessage);
    TestValidator.predicate("completed_at should be recorded", updated.completed_at !== null);
    TestValidator.predicate("delivered + failed should not exceed total", updated.delivered_count + updated.failed_count <= totalRecipients);
}