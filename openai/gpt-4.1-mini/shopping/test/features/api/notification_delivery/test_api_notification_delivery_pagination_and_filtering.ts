import api from "@ORGANIZATION/PROJECT-api";
import type { IAuthorizationToken } from "@ORGANIZATION/PROJECT-api/lib/structures/IAuthorizationToken";
import { IEntity } from "@ORGANIZATION/PROJECT-api/lib/structures/IEntity";
import type { IPage } from "@ORGANIZATION/PROJECT-api/lib/structures/IPage";
import type { IPageIShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IPageIShoppingMallNotificationDelivery";
import type { IShoppingMallAdministrator } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministrator";
import type { IShoppingMallAdministratorGrade } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallAdministratorGrade";
import type { IShoppingMallNotificationDelivery } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationDelivery";
import type { IShoppingMallNotificationTemplate } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallNotificationTemplate";
import type { IShoppingMallUserNotification } from "@ORGANIZATION/PROJECT-api/lib/structures/IShoppingMallUserNotification";
import { DeepPartial } from "@ORGANIZATION/PROJECT-api/lib/typings/DeepPartial";
import { ArrayUtil, RandomGenerator, TestValidator } from "@nestia/e2e";
import { IConnection } from "@nestia/fetcher";
import { randint } from "tstl";
import typia, { tags } from "typia";

import { authorize_administrator_join } from "../../../authorize/authorize_administrator_join";
import { authorize_administrator_login } from "../../../authorize/authorize_administrator_login";
import { authorize_administrator_refresh } from "../../../authorize/authorize_administrator_refresh";

export async function test_api_notification_delivery_pagination_and_filtering(
  connection: api.IConnection,
): Promise<void> {
  // Authenticate as administrator
  const adminConnection: api.IConnection = { host: connection.host };
  // Use utility function to join administrator
  const adminAuthorized = await authorize_administrator_join(
    adminConnection,
    {},
  );
  adminConnection.headers = {
    Authorization: `Bearer ${adminAuthorized.token.access}`,
  };
  // Prepare filter values for testing
  // Use simple filter test: no filter, page 1, limit 10
  const baseRequest: IShoppingMallNotificationDelivery.IRequest = {
    page: 1,
    limit: 10,
  };
  // Test 1: Basic pagination and default sorting
  const page1 =
    await api.functional.shoppingMall.administrator.notificationDeliveries.index(
      adminConnection,
      { body: baseRequest },
    );
  typia.assert(page1);
  // Validate pagination fields
  TestValidator.predicate(
    "pagination records non-negative",
    page1.pagination.records >= 0,
  );
  TestValidator.predicate(
    "pagination limit positive",
    page1.pagination.limit > 0,
  );
  TestValidator.predicate(
    "pagination current page positive",
    page1.pagination.current > 0,
  );
  TestValidator.predicate(
    "pagination pages non-negative",
    page1.pagination.pages >= 0,
  );
  // Validate data array length <= limit
  TestValidator.predicate(
    "data length within limit",
    page1.data.length <= page1.pagination.limit,
  );
  // Validate sorting order by attemptedAt descending
  for (let i = 1; i < page1.data.length; ++i) {
    const prev = page1.data[i - 1].attemptedAt;
    const curr = page1.data[i].attemptedAt;
    TestValidator.predicate(
      `attemptedAt descending order at index ${i}`,
      prev >= curr,
    );
  }
  // If there is data, verify nested objects and timestamps
  if (page1.data.length > 0) {
    const item = page1.data[0];
    typia.assert(item.notificationTemplate);
    typia.assert(item.userNotification);
    TestValidator.predicate(
      "attemptedAt is ISO 8601",
      /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.attemptedAt),
    );
    if (item.deliveredAt !== null && item.deliveredAt !== undefined) {
      TestValidator.predicate(
        "deliveredAt is ISO 8601",
        /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(item.deliveredAt),
      );
    }
  }
  // Test 2: Filtering by delivery status
  // Use a known status from the first page data if exists
  const sampleStatus =
    page1.data.length > 0 ? page1.data[0].status : "delivered";
  const filterStatusRequest: IShoppingMallNotificationDelivery.IRequest = {
    ...baseRequest,
    status: sampleStatus,
  };
  const filteredByStatus =
    await api.functional.shoppingMall.administrator.notificationDeliveries.index(
      adminConnection,
      { body: filterStatusRequest },
    );
  typia.assert(filteredByStatus);
  filteredByStatus.data.forEach((item) => {
    TestValidator.equals("status matches filter", item.status, sampleStatus);
  });
  // Test 3: Filtering by notification template ID
  // Use a notificationTemplate id from first page data if exists
  if (page1.data.length > 0) {
    const sampleTemplateId = page1.data[0].notificationTemplate.id;
    const filterTemplateRequest: IShoppingMallNotificationDelivery.IRequest = {
      ...baseRequest,
      shoppingMallNotificationTemplateId: sampleTemplateId,
    };
    const filteredByTemplate =
      await api.functional.shoppingMall.administrator.notificationDeliveries.index(
        adminConnection,
        { body: filterTemplateRequest },
      );
    typia.assert(filteredByTemplate);
    filteredByTemplate.data.forEach((item) => {
      TestValidator.equals(
        "notificationTemplateId matches filter",
        item.notificationTemplate.id,
        sampleTemplateId,
      );
    });
  }
  // Test 4: Filtering by channel
  const sampleChannel = page1.data.length > 0 ? page1.data[0].channel : "email";
  const filterChannelRequest: IShoppingMallNotificationDelivery.IRequest = {
    ...baseRequest,
    channel: sampleChannel,
  };
  const filteredByChannel =
    await api.functional.shoppingMall.administrator.notificationDeliveries.index(
      adminConnection,
      { body: filterChannelRequest },
    );
  typia.assert(filteredByChannel);
  filteredByChannel.data.forEach((item) => {
    TestValidator.equals("channel matches filter", item.channel, sampleChannel);
  });
  // Test 5: Filtering by ownerType
  const sampleOwnerType =
    page1.data.length > 0
      ? page1.data[0].userNotification.ownerType
      : "customer";
  const filterOwnerTypeRequest: IShoppingMallNotificationDelivery.IRequest = {
    ...baseRequest,
    ownerType: sampleOwnerType,
  };
  const filteredByOwnerType =
    await api.functional.shoppingMall.administrator.notificationDeliveries.index(
      adminConnection,
      { body: filterOwnerTypeRequest },
    );
  typia.assert(filteredByOwnerType);
  filteredByOwnerType.data.forEach((item) => {
    TestValidator.equals(
      "ownerType matches filter",
      item.userNotification.ownerType,
      sampleOwnerType,
    );
  });
  // Test 6: Pagination - get second page if possible
  if (page1.pagination.pages >= 2) {
    const page2Request: IShoppingMallNotificationDelivery.IRequest = {
      ...baseRequest,
      page: 2,
    };
    const page2 =
      await api.functional.shoppingMall.administrator.notificationDeliveries.index(
        adminConnection,
        { body: page2Request },
      );
    typia.assert(page2);
    TestValidator.predicate("page 2 data length > 0", page2.data.length > 0);
    // Validate page2 data sorting
    for (let i = 1; i < page2.data.length; ++i) {
      const prev = page2.data[i - 1].attemptedAt;
      const curr = page2.data[i].attemptedAt;
      TestValidator.predicate(
        `page 2 attemptedAt descending order at index ${i}`,
        prev >= curr,
      );
    }
  }
}
