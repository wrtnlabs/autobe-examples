import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallCustomer } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallCustomer";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import type { IEcommerceMallSeller } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSeller";
import type { IEcommerceMallSuperAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallSuperAdmin";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_customer_join } from "../../../authorize/authorize_customer_join";
import { authorize_customer_login } from "../../../authorize/authorize_customer_login";
import { authorize_customer_refresh } from "../../../authorize/authorize_customer_refresh";
import { authorize_seller_join } from "../../../authorize/authorize_seller_join";
import { authorize_seller_login } from "../../../authorize/authorize_seller_login";
import { authorize_seller_refresh } from "../../../authorize/authorize_seller_refresh";
import { authorize_super_admin_join } from "../../../authorize/authorize_super_admin_join";
import { authorize_super_admin_login } from "../../../authorize/authorize_super_admin_login";
import { authorize_super_admin_refresh } from "../../../authorize/authorize_super_admin_refresh";
import { generate_random_ecommerce_mall_super_admin_notifications_create } from "../../../generate/generate_random_ecommerce_mall_super_admin_notifications_create";
import { prepare_random_ecommerce_mall_notification } from "../../../prepare/prepare_random_ecommerce_mall_notification";

/**
 * Test notification filtering capabilities from the super admin perspective.
 * 1. Authenticate as super admin
 * 2. Create test notifications with different types and actor types
 * 3. Test various filter combinations
 * 4. Validate filtering logic
 */
export async function test_api_super_admin_notifications_filtering(
  connection: api.IConnection,
): Promise<void> {
  // 1. Setup Phase - Authenticate super admin
  const superAdminConnection: api.IConnection = { host: connection.host };
  const superAdminAuth = await authorize_super_admin_login(
    superAdminConnection,
    {
      body: {
        email: "superadmin@test.com",
        password: "securePassword123",
      } satisfies IEcommerceMallSuperAdmin.ILogin,
    },
  );
  typia.assert(superAdminAuth);
  // 2. Create test actors (customer and seller)
  const customerResponse = await authorize_customer_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "customerPassword123",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallCustomer.IJoin,
  });
  typia.assert(customerResponse);
  const sellerResponse = await authorize_seller_join(superAdminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: "sellerPassword123",
      href: "https://example.com/join",
      referrer: "https://example.com/",
    } satisfies IEcommerceMallSeller.IJoin,
  });
  typia.assert(sellerResponse);
  // 3. Data Creation Phase - Create test notifications
  // Create notification for customer with type order_update
  const customerNotification =
    await generate_random_ecommerce_mall_super_admin_notifications_create(
      superAdminConnection,
      {
        body: {
          title: "Customer Order Update",
          body: "Your order has been shipped",
          type: "order_update" as const,
          recipients: [
            {
              title: "Customer Order Update",
              body: "Your order has been shipped",
              type: "order_update" as const,
              recipients: [
                {
                  recipient_type: "customer" as const,
                  recipient_id: customerResponse.id,
                },
              ],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(customerNotification);
  // Create notification for seller with type seller_approval
  const sellerNotification =
    await generate_random_ecommerce_mall_super_admin_notifications_create(
      superAdminConnection,
      {
        body: {
          title: "Seller Approval Request",
          body: "Your store has been approved",
          type: "seller_approval" as const,
          recipients: [
            {
              title: "Seller Approval Request",
              body: "Your store has been approved",
              type: "seller_approval" as const,
              recipients: [
                {
                  recipient_type: "seller" as const,
                  recipient_id: sellerResponse.id,
                },
              ],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(sellerNotification);
  // Create platform_announcement notification for super admin
  const platformAnnouncementNotification =
    await generate_random_ecommerce_mall_super_admin_notifications_create(
      superAdminConnection,
      {
        body: {
          title: "Platform Announcement",
          body: "System maintenance scheduled",
          type: "platform_announcement" as const,
          recipients: [
            {
              title: "Platform Announcement",
              body: "System maintenance scheduled",
              type: "platform_announcement" as const,
              recipients: [
                {
                  recipient_type: "superAdmin" as const,
                  recipient_id: superAdminAuth.id,
                },
              ],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(platformAnnouncementNotification);
  // Create another customer notification with system_alert type for read status testing
  // (using system_alert since it's one of the 4 types supported in nested IDeliver)
  const customerNotificationRead =
    await generate_random_ecommerce_mall_super_admin_notifications_create(
      superAdminConnection,
      {
        body: {
          title: "Customer Alert Notification",
          body: "Your alert has been processed",
          type: "system_alert" as const,
          recipients: [
            {
              title: "Customer Alert Notification",
              body: "Your alert has been processed",
              type: "system_alert" as const,
              recipients: [
                {
                  recipient_type: "customer" as const,
                  recipient_id: customerResponse.id,
                },
              ],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(customerNotificationRead);
  // Create system_alert notification for seller
  const systemAlertNotification =
    await generate_random_ecommerce_mall_super_admin_notifications_create(
      superAdminConnection,
      {
        body: {
          title: "System Alert",
          body: "Scheduled maintenance in 24 hours",
          type: "system_alert" as const,
          recipients: [
            {
              title: "System Alert",
              body: "Scheduled maintenance in 24 hours",
              type: "system_alert" as const,
              recipients: [
                {
                  recipient_type: "seller" as const,
                  recipient_id: sellerResponse.id,
                },
              ],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(systemAlertNotification);
  // 4. Filtering Test Phase
  // Test filter by actor_type = customer
  const customerFilterResult =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      superAdminConnection,
      {
        body: {
          actor_type: "customer",
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(customerFilterResult);
  // Validate customer filter returns customer notifications
  TestValidator.equals(
    "customer filter returns customer notifications",
    customerFilterResult.data.every(
      (n) => n.type === "order_update" || n.type === "system_alert",
    ),
    true,
  );
  // Test filter by read_status = unread
  const readStatusResult =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      superAdminConnection,
      {
        body: {
          read_status: "unread",
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(readStatusResult);
  TestValidator.predicate(
    "read_status filter returns only unread notifications",
    () => readStatusResult.data.every((n) => n.status === "unread"),
  );
  // Test filter by type = seller_approval
  const typeFilterResult =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      superAdminConnection,
      {
        body: {
          type: "seller_approval",
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(typeFilterResult);
  TestValidator.equals(
    "type filter returns seller_approval notifications",
    typeFilterResult.data.every((n) => n.type === "seller_approval"),
    true,
  );
  // Test combined filters: actor_type=seller AND read_status=unread
  const combinedFilterResult =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      superAdminConnection,
      {
        body: {
          actor_type: "seller",
          read_status: "unread",
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(combinedFilterResult);
  TestValidator.predicate(
    "combined filter returns seller notifications with unread status",
    () =>
      combinedFilterResult.data.every(
        (n) => n.type === "seller_approval" || n.type === "system_alert",
      ) && combinedFilterResult.data.every((n) => n.status === "unread"),
  );
  // Test date range filtering
  const now = new Date();
  const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  const dateRangeResult =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      superAdminConnection,
      {
        body: {
          created_at_from: oneDayAgo.toISOString(),
          created_at_to: oneDayFromNow.toISOString(),
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(dateRangeResult);
  TestValidator.predicate(
    "date range filter returns notifications within range",
    () =>
      dateRangeResult.data.every((n) => {
        const notificationDate = new Date(n.created_at);
        return (
          notificationDate >= oneDayAgo && notificationDate <= oneDayFromNow
        );
      }),
  );
  // 5. Validation Phase
  // Verify super admin can see all notifications regardless of actor type
  const allNotificationsResult =
    await api.functional.ecommerceMall.superAdmin.notifications.index(
      superAdminConnection,
      {
        body: {
          per_page: 100,
        } satisfies IEcommerceMallNotification.IRequest,
      },
    );
  typia.assert(allNotificationsResult);
  TestValidator.predicate(
    "super admin can see notifications from all actor types",
    () => allNotificationsResult.data.length > 0,
  );
  // Verify notifications from different types are present
  TestValidator.equals(
    "all notification types are visible to super admin",
    allNotificationsResult.data.some((n) => n.type === "order_update"),
    true,
  );
  TestValidator.equals(
    "seller_approval notifications are visible",
    allNotificationsResult.data.some((n) => n.type === "seller_approval"),
    true,
  );
  TestValidator.equals(
    "platform_announcement notifications are visible",
    allNotificationsResult.data.some((n) => n.type === "platform_announcement"),
    true,
  );
  TestValidator.equals(
    "system_alert notifications are visible",
    allNotificationsResult.data.some((n) => n.type === "system_alert"),
    true,
  );
}
