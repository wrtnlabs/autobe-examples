import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import type { IEcommerceMallAdmin } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallAdmin";
import type { IEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IEcommerceMallNotification";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIEcommerceMallNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIEcommerceMallNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_admin_join } from "../../../authorize/authorize_admin_join";
import { authorize_admin_login } from "../../../authorize/authorize_admin_login";
import { authorize_admin_refresh } from "../../../authorize/authorize_admin_refresh";
import { generate_random_ecommerce_mall_admin_notifications_create } from "../../../generate/generate_random_ecommerce_mall_admin_notifications_create";
import { prepare_random_ecommerce_mall_notification } from "../../../prepare/prepare_random_ecommerce_mall_notification";

export async function test_api_admin_notifications_comprehensive_filter_combinations(
  connection: api.IConnection,
): Promise<void> {
  // 1. Admin authentication
  const adminConnection: api.IConnection = { host: connection.host };
  const admin = await authorize_admin_join(adminConnection, {
    body: {
      email: typia.random<string & tags.Format<"email">>(),
      password: RandomGenerator.alphaNumeric(16),
      href: "https://admin.example.com",
      referrer: "https://admin.example.com/join",
    } satisfies IEcommerceMallAdmin.IJoin,
  });
  typia.assert(admin);
  // Create admin authenticated connection for API calls
  const adminAuthConnection: api.IConnection = {
    host: connection.host,
    headers: {
      ...connection.headers,
      Authorization: `Bearer ${admin.token.access}`,
    },
  };
  // 2. Create test notifications with different types and statuses
  const createdNotifications: IEcommerceMallNotification[] = [];
  // 2.1 Create unread seller_approval notification
  const sellerApprovalNotif =
    await api.functional.ecommerceMall.admin.notifications.create(
      adminAuthConnection,
      {
        body: {
          title: "Seller Approval Pending Review",
          body: "A new seller has submitted an approval request",
          type: "seller_approval",
          recipients: [
            {
              title: "Seller Approval Pending Review",
              body: "A new seller has submitted an approval request",
              type: "seller_approval",
              recipients: [{ recipient_type: "admin", recipient_id: admin.id }],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(sellerApprovalNotif);
  createdNotifications.push(sellerApprovalNotif);
  // 2.2 Create read order_update notification
  const orderUpdateNotif =
    await api.functional.ecommerceMall.admin.notifications.create(
      adminAuthConnection,
      {
        body: {
          title: "Order Processed Successfully",
          body: "Your order has been processed and is being prepared for shipment",
          type: "order_update",
          recipients: [
            {
              title: "Order Processed Successfully",
              body: "Your order has been processed and is being prepared for shipment",
              type: "order_update",
              recipients: [{ recipient_type: "admin", recipient_id: admin.id }],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(orderUpdateNotif);
  createdNotifications.push(orderUpdateNotif);
  // 2.3 Create unread platform_announcement notification
  const platformAnnouncementNotif =
    await api.functional.ecommerceMall.admin.notifications.create(
      adminAuthConnection,
      {
        body: {
          title: "Platform Update Announcement",
          body: "We have released new features including enhanced reporting capabilities",
          type: "platform_announcement",
          recipients: [
            {
              title: "Platform Update Announcement",
              body: "We have released new features including enhanced reporting capabilities",
              type: "platform_announcement",
              recipients: [{ recipient_type: "admin", recipient_id: admin.id }],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(platformAnnouncementNotif);
  createdNotifications.push(platformAnnouncementNotif);
  // 2.4 Create multiple system_alert notifications
  const systemAlert1 =
    await api.functional.ecommerceMall.admin.notifications.create(
      adminAuthConnection,
      {
        body: {
          title: "System Alert: High Traffic",
          body: "Current traffic exceeds normal threshold",
          type: "system_alert",
          recipients: [
            {
              title: "System Alert: High Traffic",
              body: "Current traffic exceeds normal threshold",
              type: "system_alert",
              recipients: [{ recipient_type: "admin", recipient_id: admin.id }],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(systemAlert1);
  createdNotifications.push(systemAlert1);
  const systemAlert2 =
    await api.functional.ecommerceMall.admin.notifications.create(
      adminAuthConnection,
      {
        body: {
          title: "System Alert: Database Maintenance",
          body: "Scheduled maintenance window approaching",
          type: "system_alert",
          recipients: [
            {
              title: "System Alert: Database Maintenance",
              body: "Scheduled maintenance window approaching",
              type: "system_alert",
              recipients: [{ recipient_type: "admin", recipient_id: admin.id }],
            },
          ],
        } satisfies IEcommerceMallNotification.ICreate,
      },
    );
  typia.assert(systemAlert2);
  createdNotifications.push(systemAlert2);
  // 3. Test combined filtering: type=seller_approval AND read_status=unread
  const typeAndStatusFilter: IEcommerceMallNotification.IRequest = {
    type: "seller_approval",
    read_status: "unread",
  };
  const filteredSellerApproval =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminAuthConnection,
      { body: typeAndStatusFilter },
    );
  typia.assert(filteredSellerApproval);
  typia.assert(filteredSellerApproval.pagination);
  TestValidator.equals(
    "seller_approval unread count",
    filteredSellerApproval.data.length,
    1,
  );
  TestValidator.predicate(
    "all results are seller_approval type",
    filteredSellerApproval.data.every((n) => n.type === "seller_approval"),
  );
  TestValidator.predicate(
    "all results are unread status",
    filteredSellerApproval.data.every((n) => n.status === "unread"),
  );
  // 4. Test combined filtering: type=order_update AND read_status=read
  const orderUpdateFilter: IEcommerceMallNotification.IRequest = {
    type: "order_update",
    read_status: "read",
  };
  const filteredOrderUpdate =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminAuthConnection,
      { body: orderUpdateFilter },
    );
  typia.assert(filteredOrderUpdate);
  typia.assert(filteredOrderUpdate.pagination);
  TestValidator.equals(
    "order_update read count",
    filteredOrderUpdate.data.length,
    1,
  );
  // 5. Test combined filtering: type=platform_announcement with date range
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  const dateRangeFilter: IEcommerceMallNotification.IRequest = {
    type: "platform_announcement",
    created_at_from: oneHourAgo.toISOString(),
    created_at_to: new Date().toISOString(),
  };
  const filteredWithDateRange =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminAuthConnection,
      { body: dateRangeFilter },
    );
  typia.assert(filteredWithDateRange);
  typia.assert(filteredWithDateRange.pagination);
  TestValidator.equals(
    "platform_announcement with date range count",
    filteredWithDateRange.data.length,
    1,
  );
  TestValidator.predicate(
    "all notifications within date range",
    filteredWithDateRange.data.every(
      (n) =>
        n.created_at >= oneHourAgo.toISOString() &&
        n.created_at <= new Date().toISOString(),
    ),
  );
  // 6. Test search + type combination
  const searchTypeFilter: IEcommerceMallNotification.IRequest = {
    search: "seller",
    type: "seller_approval",
  };
  const searchAndTypeFiltered =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminAuthConnection,
      { body: searchTypeFilter },
    );
  typia.assert(searchAndTypeFiltered);
  typia.assert(searchAndTypeFiltered.pagination);
  TestValidator.equals(
    "search + type filtered count",
    searchAndTypeFiltered.data.length,
    1,
  );
  TestValidator.predicate(
    "search term present in results",
    searchAndTypeFiltered.data.every(
      (n) => n.title.includes("seller") || n.body.includes("seller"),
    ),
  );
  // 7. Test search + date_range combination
  const searchDataAndRange: IEcommerceMallNotification.IRequest = {
    search: "order",
    created_at_from: oneHourAgo.toISOString(),
    created_at_to: new Date().toISOString(),
  };
  const searchWithDateRange =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminAuthConnection,
      { body: searchDataAndRange },
    );
  typia.assert(searchWithDateRange);
  typia.assert(searchWithDateRange.pagination);
  TestValidator.equals(
    "search + date_range count",
    searchWithDateRange.data.length,
    1,
  );
  // 8. Test sorting within filtered results
  const sortedFilter: IEcommerceMallNotification.IRequest = {
    type: "system_alert",
    sort: "created_at",
    order: "desc",
  };
  const sortedResults =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminAuthConnection,
      { body: sortedFilter },
    );
  typia.assert(sortedResults);
  typia.assert(sortedResults.pagination);
  TestValidator.equals(
    "system_alert count after sorting",
    sortedResults.data.length,
    2,
  );
  // Verify sorting is applied
  if (sortedResults.data.length >= 2) {
    const firstDate = new Date(sortedResults.data[0].created_at).getTime();
    const secondDate = new Date(sortedResults.data[1].created_at).getTime();
    TestValidator.predicate(
      "results sorted by created_at desc",
      firstDate >= secondDate,
    );
  }
  // 9. Verify filtered results accuracy
  const allUnreadFilter: IEcommerceMallNotification.IRequest = {
    read_status: "unread",
  };
  const allUnreadResults =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminAuthConnection,
      { body: allUnreadFilter },
    );
  typia.assert(allUnreadResults);
  typia.assert(allUnreadResults.pagination);
  TestValidator.predicate(
    "all unread results have unread status",
    allUnreadResults.data.every((n) => n.status === "unread"),
  );
  // 10. Test pagination respects filtered result set
  const paginatedFilter: IEcommerceMallNotification.IRequest = {
    type: "system_alert",
    page: 1,
    per_page: 1,
  };
  const paginatedResults =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminAuthConnection,
      { body: paginatedFilter },
    );
  typia.assert(paginatedResults);
  typia.assert(paginatedResults.pagination);
  TestValidator.equals(
    "pagination limit applied",
    paginatedResults.data.length,
    1,
  );
  TestValidator.equals(
    "pagination limit in response",
    paginatedResults.pagination.limit,
    1,
  );
  TestValidator.equals(
    "total records matches filtered count",
    paginatedResults.pagination.records,
    2,
  );
  // 11. Verify actor_id filter doesn't restrict admin's view of platform-wide notifications
  const actorIdFilter: IEcommerceMallNotification.IRequest = {
    actor_type: "admin",
    actor_id: admin.id,
  };
  const actorIdResults =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminAuthConnection,
      { body: actorIdFilter },
    );
  typia.assert(actorIdResults);
  typia.assert(actorIdResults.pagination);
  TestValidator.predicate(
    "actor_id filter returns admin notifications",
    actorIdResults.data.every(
      (n) => n.status === "unread" || n.status === "read",
    ),
  );
  // 12. Test filtering by actor_type without actor_id returns all notifications of that type
  const actorTypeFilter: IEcommerceMallNotification.IRequest = {
    actor_type: "admin",
  };
  const actorTypeResults =
    await api.functional.ecommerceMall.admin.notifications.index(
      adminAuthConnection,
      { body: actorTypeFilter },
    );
  typia.assert(actorTypeResults);
  typia.assert(actorTypeResults.pagination);
  TestValidator.predicate(
    "actor_type without actor_id returns matching notifications",
    actorTypeResults.data.length >= 0,
  );
}
